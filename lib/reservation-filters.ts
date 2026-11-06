import "server-only";
import { RESERVATION_COLUMNS, type ReservationRow } from "@/components/admin/ReservationCard";
import { db } from "@/lib/db";

/* The filters of the admin reservations list, shared by the page and its CSV export. */

export const STATUS_FILTERS = ["all", "pending", "confirmed", "declined", "cancelled"];
export const TYPE_FILTERS = ["all", "table", "private"];
export const WHEN_FILTERS = ["upcoming", "past", "all"];
export const PAGE_SIZE = 50;

export interface ReservationFilters {
  status: string;
  type: string;
  when: string;
  q: string;
  from: string;
  to: string;
  page: number;
}

type Value = string | string[] | null | undefined;
const first = (value: Value) => (Array.isArray(value) ? value[0] : value) ?? "";
const pick = (value: Value, allowed: string[], fallback: string) => {
  const single = first(value);
  return allowed.includes(single) ? single : fallback;
};
const day = (value: Value) => {
  const single = first(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(single) && !Number.isNaN(Date.parse(`${single}T12:00:00Z`)) &&
    new Date(`${single}T12:00:00Z`).toISOString().startsWith(single)
    ? single
    : "";
};

export function parseFilters(get: (key: string) => Value): ReservationFilters {
  return {
    status: pick(get("status"), STATUS_FILTERS, "all"),
    type: pick(get("type"), TYPE_FILTERS, "all"),
    when: pick(get("when"), WHEN_FILTERS, "upcoming"),
    q: first(get("q")).trim().slice(0, 100),
    from: day(get("from")),
    to: day(get("to")),
    page: Math.min(10_000, Math.max(0, Number.parseInt(first(get("page")), 10) || 0)),
  };
}

/* Everything except the page, for links that keep the current filters. */
export function filterQuery(f: ReservationFilters, extra: Record<string, string | number> = {}) {
  const base: Record<string, string> = { status: f.status, type: f.type, when: f.when, q: f.q, from: f.from, to: f.to };
  const merged = { ...base, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) };
  return new URLSearchParams(Object.entries(merged).filter(([, v]) => v !== "")).toString();
}

export async function findReservations(f: ReservationFilters, limit: number, offset: number) {
  const sql = db();
  const today = sql.unsafe("(now() at time zone 'Europe/Berlin')::date");
  const like = `%${f.q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
  const from = f.from || null;
  const to = f.to || null;
  const where = sql`
    (${f.status} = 'all' or status = ${f.status})
    and (${f.type} = 'all' or is_private = ${f.type === "private"})
    and (${f.when} = 'all' or (${f.when} = 'upcoming' and date >= ${today}) or (${f.when} = 'past' and date < ${today}))
    and (${f.q} = '' or name ilike ${like} or phone ilike ${like} or email ilike ${like})
    and (${from}::date is null or date >= ${from}::date)
    and (${to}::date is null or date <= ${to}::date)
  `;
  const [rows, [{ total }]] = (await Promise.all([
    sql`
      select ${sql.unsafe(RESERVATION_COLUMNS)} from reservations
      where ${where}
      order by
        case when ${f.when} = 'past' then null else date end asc,
        case when ${f.when} = 'past' then date end desc,
        time
      limit ${limit} offset ${offset}
    `,
    sql`select count(*)::int as total from reservations where ${where}`,
  ])) as [ReservationRow[], { total: number }[]];
  return { rows, total };
}
