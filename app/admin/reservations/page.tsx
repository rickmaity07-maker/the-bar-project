import { Empty, PageTitle } from "@/components/admin/Panel";
import ReservationCard from "@/components/admin/ReservationCard";
import { INPUT } from "@/components/admin/styles";
import { STATUS_LABEL } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { filterQuery, findReservations, PAGE_SIZE, parseFilters, STATUS_FILTERS } from "@/lib/reservation-filters";

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function ReservationsPage({ searchParams }: { searchParams: Params }) {
  await requireOwner();
  const params = await searchParams;
  const filters = parseFilters((key) => params[key]);
  const { status, type, when, q, from, to, page } = filters;
  const { rows, total } = await findReservations(filters, PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const select = (name: string, value: string, options: [string, string][], label: string) => (
    <select name={name} defaultValue={value} aria-label={label} className={`${INPUT} w-auto pr-8`}>
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
  const pageLink = (target: number) => `/admin/reservations?${filterQuery(filters, { page: target })}`;

  return (
    <>
      <PageTitle title="Reservierungen">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-mist">
            {total} Treffer
            {pages > 1 && ` · Seite ${page + 1} von ${pages}`}
          </p>
          <a
            href={`/admin/reservations/export?${filterQuery(filters)}`}
            className="label rounded-full px-4 py-2.5 text-foam ring-1 ring-inset ring-foam/25 transition-colors hover:bg-foam hover:text-abyss"
          >
            Als CSV laden
          </a>
        </div>
      </PageTitle>

      <form className="mb-6 flex flex-wrap gap-2">
        {select(
          "status",
          status,
          [["all", "Alle Status"], ...STATUS_FILTERS.slice(1).map((key): [string, string] => [key, STATUS_LABEL[key]])],
          "Status",
        )}
        {select(
          "type",
          type,
          [
            ["all", "Tische und Events"],
            ["table", "Nur Tische"],
            ["private", "Nur private Events"],
          ],
          "Art",
        )}
        {select(
          "when",
          when,
          [
            ["upcoming", "Ab heute"],
            ["past", "Vergangen"],
            ["all", "Alle Daten"],
          ],
          "Zeitraum",
        )}
        <input type="date" name="from" defaultValue={from} aria-label="Von" className={`${INPUT} w-auto`} />
        <input type="date" name="to" defaultValue={to} aria-label="Bis" className={`${INPUT} w-auto`} />
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

      {pages > 1 && (
        <div className="mt-6 flex gap-3">
          {page > 0 && (
            <a href={pageLink(page - 1)} className="label rounded-full px-5 py-3 text-foam ring-1 ring-foam/25 hover:bg-foam/10">
              Zurück
            </a>
          )}
          {page + 1 < pages && (
            <a href={pageLink(page + 1)} className="label rounded-full px-5 py-3 text-foam ring-1 ring-foam/25 hover:bg-foam/10">
              Weitere
            </a>
          )}
        </div>
      )}
    </>
  );
}
