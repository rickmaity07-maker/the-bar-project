import { Empty, PageTitle, Panel } from "@/components/admin/Panel";
import { actionLabel, formatStamp } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

interface ActivityRow {
  id: string;
  at: string;
  user_email: string;
  action: string;
  entity: string;
  detail: string;
}

type Params = Promise<Record<string, string | string[] | undefined>>;

const AREAS: [string, string][] = [
  ["all", "Alles"],
  ["reservation", "Reservierungen"],
  ["menu", "Karte"],
  ["hours", "Öffnungszeiten"],
  ["user", "Nutzer"],
];
const PAGE_SIZE = 100;

export default async function ActivityPage({ searchParams }: { searchParams: Params }) {
  await requireOwner();
  const params = await searchParams;
  const area = AREAS.some(([key]) => key === params.area) ? String(params.area) : "all";
  const page = Math.max(0, Number.parseInt(String(params.page ?? "0"), 10) || 0);

  const rows = (await db()`
    select id, at, user_email, action, entity, detail from activity_log
    where (${area} = 'all' or action like ${`${area}.%`})
    order by at desc
    limit ${PAGE_SIZE + 1} offset ${page * PAGE_SIZE}
  `) as ActivityRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const link = (next: Record<string, string | number>) =>
    `/admin/activity?${new URLSearchParams({ area, page: String(page), ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      <PageTitle title="Aktivität" />
      <div className="mb-6 flex flex-wrap gap-2">
        {AREAS.map(([key, label]) => (
          <a
            key={key}
            href={link({ area: key, page: 0 })}
            className={`label rounded-full px-4 py-2.5 transition-colors ${
              key === area ? "bg-foam text-abyss" : "text-foam ring-1 ring-inset ring-foam/25 hover:bg-foam/10"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <Panel>
        {rows.length ? (
          <ul className="divide-y divide-foam/10">
            {rows.slice(0, PAGE_SIZE).map((entry) => (
              <li key={entry.id} className="grid grid-cols-1 gap-1 py-3 text-sm md:grid-cols-[11rem_1fr_16rem] md:gap-4">
                <span className="text-mist">{formatStamp(entry.at)}</span>
                <span className="text-foam">
                  {actionLabel(entry.action)}
                  {entry.detail && <span className="break-words text-mist"> · {entry.detail}</span>}
                </span>
                <span className="break-all text-mist md:text-right">{entry.user_email || "Website"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Noch keine Einträge.</Empty>
        )}
      </Panel>

      <div className="mt-6 flex gap-3">
        {page > 0 && (
          <a href={link({ page: page - 1 })} className="label rounded-full px-5 py-3 text-foam ring-1 ring-foam/25 hover:bg-foam/10">
            Neuere
          </a>
        )}
        {hasMore && (
          <a href={link({ page: page + 1 })} className="label rounded-full px-5 py-3 text-foam ring-1 ring-foam/25 hover:bg-foam/10">
            Ältere
          </a>
        )}
      </div>
    </>
  );
}
