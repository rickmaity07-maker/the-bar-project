import { addClosedDate, removeClosedDate, saveHours } from "@/app/admin/actions";
import { Empty, Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { formatDate, WEEKDAYS } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_WEEK } from "@/lib/site";

interface HoursRow {
  weekday: number;
  closed: boolean;
  opens: string;
  closes: string;
}

/* Monday first, as the week is read in Germany. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function HoursPage() {
  await requireOwner();
  const sql = db();
  const [hours, closed] = (await Promise.all([
    sql`select weekday, closed, to_char(opens, 'HH24:MI') as opens, to_char(closes, 'HH24:MI') as closes from opening_hours`,
    sql`select date::text as date, reason from closed_dates
        where date >= (now() at time zone 'Europe/Berlin')::date order by date`,
  ])) as [HoursRow[], { date: string; reason: string }[]];

  const week = DEFAULT_WEEK.map((fallback, weekday) => {
    const row = hours.find((entry) => entry.weekday === weekday);
    return row ? { closed: row.closed, open: row.opens, close: row.closes } : fallback;
  });

  return (
    <>
      <PageTitle title="Öffnungszeiten" />
      <Notice>
        Die Zeiten erscheinen auf der Website, und an geschlossenen Tagen nimmt das Formular keine Reservierungen an.
        Endet ein Abend nach Mitternacht, einfach die Uhrzeit des Folgetags eintragen, zum Beispiel 03:00.
      </Notice>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
        <Panel>
          <h2 className="display text-3xl text-foam">Wochenplan</h2>
          <form action={saveHours} className="mt-6 flex flex-col gap-3">
            {ORDER.map((day) => (
              <fieldset
                key={day}
                className="grid grid-cols-[7.5rem_1fr] items-center gap-3 rounded-3xl bg-abyss/60 p-3 ring-1 ring-foam/10 sm:grid-cols-[7.5rem_auto_1fr_1fr]"
              >
                <legend className="sr-only">{WEEKDAYS[day]}</legend>
                <span className="pl-2 text-foam">{WEEKDAYS[day]}</span>
                <label className="label flex items-center gap-2 text-foam/80">
                  <input
                    type="checkbox"
                    name={`closed_${day}`}
                    defaultChecked={week[day].closed}
                    className="h-4 w-4 accent-buoy"
                  />
                  Geschlossen
                </label>
                <label className="flex items-center gap-2 text-sm text-mist">
                  ab
                  <input type="time" name={`opens_${day}`} defaultValue={week[day].open} className={INPUT} />
                </label>
                <label className="flex items-center gap-2 text-sm text-mist">
                  bis
                  <input type="time" name={`closes_${day}`} defaultValue={week[day].close} className={INPUT} />
                </label>
              </fieldset>
            ))}
            <div className="mt-2">
              <Submit>Wochenplan speichern</Submit>
            </div>
          </form>
        </Panel>

        <Panel>
          <h2 className="display text-3xl text-foam">Einzelne Schließtage</h2>
          <p className="mt-2 text-sm text-mist">Urlaub, Feiertage oder eine private Veranstaltung.</p>
          <form action={addClosedDate} className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-[11rem_1fr_auto]">
            <input type="date" name="date" required aria-label="Datum" className={INPUT} />
            <input name="reason" maxLength={200} placeholder="Grund (nur intern)" aria-label="Grund" className={INPUT} />
            <Submit>Eintragen</Submit>
          </form>
          {closed.length ? (
            <ul className="mt-6 divide-y divide-foam/10">
              {closed.map((entry) => (
                <li key={entry.date} className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="text-foam">{formatDate(entry.date)}</span>
                    {entry.reason && <span className="text-sm text-mist"> · {entry.reason}</span>}
                  </span>
                  <form action={removeClosedDate}>
                    <input type="hidden" name="date" value={entry.date} />
                    <Submit variant="danger">Entfernen</Submit>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Keine Schließtage eingetragen.</Empty>
          )}
        </Panel>
      </div>
    </>
  );
}
