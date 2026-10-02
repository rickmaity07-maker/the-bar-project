import { Empty, PageTitle } from "@/components/admin/Panel";
import ReservationCard, { RESERVATION_COLUMNS, type ReservationRow } from "@/components/admin/ReservationCard";
import { INPUT } from "@/components/admin/styles";
import { STATUS_LABEL } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = Promise<Record<string, string | string[] | undefined>>;

const pick = (value: string | string[] | undefined, allowed: string[], fallback: string) => {
  const single = Array.isArray(value) ? value[0] : value;
  return single && allowed.includes(single) ? single : fallback;
};

const STATUS_FILTERS = ["all", "pending", "confirmed", "declined", "cancelled"];
const TYPE_FILTERS = ["all", "table", "private"];
const WHEN_FILTERS = ["upcoming", "past", "all"];

export default async function ReservationsPage({ searchParams }: { searchParams: Params }) {
  await requireOwner();
  const params = await searchParams;
  const status = pick(params.status, STATUS_FILTERS, "all");
  const type = pick(params.type, TYPE_FILTERS, "all");
  const when = pick(params.when, WHEN_FILTERS, "upcoming");
  const q = String(Array.isArray(params.q) ? params.q[0] : (params.q ?? "")).trim().slice(0, 100);

  const sql = db();
  const today = sql.unsafe("(now() at time zone 'Europe/Berlin')::date");
  const like = `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const rows = (await sql`
    select ${sql.unsafe(RESERVATION_COLUMNS)} from reservations
    where (${status} = 'all' or status = ${status})
      and (${type} = 'all' or is_private = ${type === "private"})
      and (${when} = 'all' or (${when} = 'upcoming' and date >= ${today}) or (${when} = 'past' and date < ${today}))
      and (${q} = '' or name ilike ${like} or phone ilike ${like} or email ilike ${like})
    order by
      case when ${when} = 'past' then null else date end asc,
      case when ${when} = 'past' then date end desc,
      time
    limit 200
  `) as ReservationRow[];

  const select = (name: string, value: string, options: [string, string][]) => (
    <select name={name} defaultValue={value} aria-label={name} className={`${INPUT} w-auto pr-8`}>
      {options.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <PageTitle title="Reservierungen">
        <p className="text-sm text-mist">{rows.length === 200 ? "Die ersten 200 Treffer" : `${rows.length} Treffer`}</p>
      </PageTitle>

      <form className="mb-6 flex flex-wrap gap-2">
        {select("status", status, [
          ["all", "Alle Status"],
          ...STATUS_FILTERS.slice(1).map((key): [string, string] => [key, STATUS_LABEL[key]]),
        ])}
        {select("type", type, [
          ["all", "Tische und Events"],
          ["table", "Nur Tische"],
          ["private", "Nur private Events"],
        ])}
        {select("when", when, [
          ["upcoming", "Ab heute"],
          ["past", "Vergangen"],
          ["all", "Alle Daten"],
        ])}
        <input name="q" defaultValue={q} placeholder="Name, Telefon, E-Mail" aria-label="Suche" className={`${INPUT} w-56`} />
        <button
          type="submit"
          className="label rounded-full bg-buoy px-5 py-2.5 text-abyss transition-colors hover:bg-foam"
        >
          Filtern
        </button>
        <a href="/admin/reservations" className="label flex items-center px-3 text-mist hover:text-foam">
          Zurücksetzen
        </a>
      </form>

      <div className="flex flex-col gap-4">
        {rows.length ? (
          rows.map((r) => <ReservationCard key={r.id} reservation={r} />)
        ) : (
          <Empty>Keine Reservierungen für diese Auswahl.</Empty>
        )}
      </div>
    </>
  );
}
