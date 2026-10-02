import { Empty, PageTitle, Panel } from "@/components/admin/Panel";
import ReservationCard, { RESERVATION_COLUMNS, type ReservationRow } from "@/components/admin/ReservationCard";
import { actionLabel, formatStamp } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

interface Stats {
  pending: number;
  today: number;
  today_guests: number;
  week_guests: number;
  private_upcoming: number;
}

interface ActivityRow {
  id: string;
  at: string;
  user_email: string;
  action: string;
  detail: string;
}

/* "Today" is Schweinfurt's date, not the server's. */
const TODAY = "(now() at time zone 'Europe/Berlin')::date";

export default async function AdminOverview() {
  const me = await requireOwner();
  const sql = db();
  const today = sql.unsafe(TODAY);

  const [[stats], pending, upcoming, activity] = (await Promise.all([
    sql`
      select
        count(*) filter (where status = 'pending' and date >= ${today})::int as pending,
        count(*) filter (where status = 'confirmed' and date = ${today})::int as today,
        coalesce(sum(guests) filter (where status = 'confirmed' and date = ${today}), 0)::int as today_guests,
        coalesce(sum(guests) filter (where status = 'confirmed' and date between ${today} and ${today} + 6), 0)::int as week_guests,
        count(*) filter (where is_private and status in ('pending', 'confirmed') and date >= ${today})::int as private_upcoming
      from reservations
    `,
    sql`select ${sql.unsafe(RESERVATION_COLUMNS)} from reservations
        where status = 'pending' and date >= ${today} order by date, time limit 5`,
    sql`select ${sql.unsafe(RESERVATION_COLUMNS)} from reservations
        where status = 'confirmed' and date >= ${today} order by date, time limit 5`,
    sql`select id, at, user_email, action, detail from activity_log order by at desc limit 8`,
  ])) as [Stats[], ReservationRow[], ReservationRow[], ActivityRow[]];

  const tiles = [
    { label: "Offene Anfragen", value: stats.pending, href: "/admin/reservations?status=pending" },
    { label: "Heute bestätigt", value: stats.today, sub: `${stats.today_guests} Gäste` },
    { label: "Gäste, nächste 7 Tage", value: stats.week_guests },
    { label: "Private Events geplant", value: stats.private_upcoming, href: "/admin/reservations?type=private" },
  ];

  return (
    <>
      <PageTitle title={`Hallo${me.name ? `, ${me.name}` : ""}.`} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="label text-[10px] text-mist">{tile.label}</p>
              <p className="display mt-3 text-5xl text-foam">{tile.value}</p>
              {tile.sub && <p className="mt-1 text-sm text-mist">{tile.sub}</p>}
            </>
          );
          return tile.href ? (
            <a
              key={tile.label}
              href={tile.href}
              className="rounded-[1.75rem] bg-trench p-5 ring-1 ring-foam/10 transition-colors hover:ring-buoy/60 md:p-6"
            >
              {body}
            </a>
          ) : (
            <div key={tile.label} className="rounded-[1.75rem] bg-trench p-5 ring-1 ring-foam/10 md:p-6">
              {body}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <Panel>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="display text-3xl text-foam">Warten auf Antwort</h2>
            <a href="/admin/reservations?status=pending" className="label text-buoy hover:text-foam">
              Alle
            </a>
          </div>
          <div className="flex flex-col gap-4">
            {pending.length ? (
              pending.map((r) => <ReservationCard key={r.id} reservation={r} />)
            ) : (
              <Empty>Keine offenen Anfragen.</Empty>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="display text-3xl text-foam">Als Nächstes</h2>
            <a href="/admin/reservations?status=confirmed" className="label text-buoy hover:text-foam">
              Alle
            </a>
          </div>
          <div className="flex flex-col gap-4">
            {upcoming.length ? (
              upcoming.map((r) => <ReservationCard key={r.id} reservation={r} />)
            ) : (
              <Empty>Keine bestätigten Reservierungen.</Empty>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="display text-3xl text-foam">Letzte Änderungen</h2>
          <a href="/admin/activity" className="label text-buoy hover:text-foam">
            Protokoll
          </a>
        </div>
        {activity.length ? (
          <ul className="divide-y divide-foam/10">
            {activity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3 text-sm">
                <span className="text-foam">
                  {actionLabel(entry.action)}
                  {entry.detail && <span className="text-mist"> · {entry.detail}</span>}
                </span>
                <span className="text-mist">
                  {entry.user_email || "Website"} · {formatStamp(entry.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Noch keine Einträge.</Empty>
        )}
      </Panel>
    </>
  );
}
