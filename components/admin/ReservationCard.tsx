import { deleteReservation, saveReservationNote, setReservationStatus } from "@/app/admin/actions";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { formatDate, formatStamp, OCCASION_LABEL, STATUS_LABEL, STATUS_STYLE } from "@/lib/admin-format";

export interface ReservationRow {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  end_time: string | null;
  guests: number;
  is_private: boolean;
  occasion: string;
  message: string;
  locale: string;
  status: string;
  admin_note: string;
  account_email: string | null;
}

/* The columns every reservation query selects, with dates and times as plain strings. */
export const RESERVATION_COLUMNS = `id, created_at, name, phone, email, date::text as date,
  to_char(time, 'HH24:MI') as time, to_char(end_time, 'HH24:MI') as end_time, guests,
  is_private, occasion, message, locale, status, admin_note,
  (select u.email from users u where u.id = reservations.user_id) as account_email`;

const NEXT_STEPS: Record<string, { status: string; label: string; variant: "solid" | "ghost" | "danger" }[]> = {
  pending: [
    { status: "confirmed", label: "Bestätigen", variant: "solid" },
    { status: "declined", label: "Ablehnen", variant: "danger" },
  ],
  confirmed: [{ status: "cancelled", label: "Stornieren", variant: "danger" }],
  declined: [{ status: "pending", label: "Wieder öffnen", variant: "ghost" }],
  cancelled: [{ status: "pending", label: "Wieder öffnen", variant: "ghost" }],
};

export default function ReservationCard({ reservation: r }: { reservation: ReservationRow }) {
  return (
    <article className="rounded-3xl bg-abyss/60 p-5 ring-1 ring-foam/10 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`label rounded-full px-3 py-1.5 text-[10px] ${STATUS_STYLE[r.status]}`}>
              {STATUS_LABEL[r.status]}
            </span>
            {r.is_private && (
              <span className="label rounded-full bg-reef px-3 py-1.5 text-[10px] text-foam ring-1 ring-buoy/50">
                Private Veranstaltung
              </span>
            )}
          </div>
          <h3 className="display mt-3 text-2xl text-foam md:text-3xl">{r.name}</h3>
        </div>
        <div className="text-right">
          <p className="display text-2xl text-foam">{formatDate(r.date)}</p>
          <p className="text-sm text-mist">
            {r.time}
            {r.end_time ? ` bis ${r.end_time}` : ""} Uhr · {r.guests} {r.guests === 1 ? "Gast" : "Gäste"}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="label text-[10px] text-mist">Telefon</dt>
          <dd>
            <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="text-foam underline-offset-4 hover:underline">
              {r.phone}
            </a>
          </dd>
        </div>
        {r.email && (
          <div>
            <dt className="label text-[10px] text-mist">E-Mail</dt>
            <dd className="break-all">
              <a href={`mailto:${r.email}`} className="text-foam underline-offset-4 hover:underline">
                {r.email}
              </a>
            </dd>
          </div>
        )}
        {r.account_email && r.account_email !== r.email && (
          <div>
            <dt className="label text-[10px] text-mist">Konto</dt>
            <dd className="break-all text-foam">{r.account_email}</dd>
          </div>
        )}
        {r.is_private && (
          <div>
            <dt className="label text-[10px] text-mist">Anlass</dt>
            <dd className="text-foam">{OCCASION_LABEL[r.occasion] ?? r.occasion}</dd>
          </div>
        )}
        <div>
          <dt className="label text-[10px] text-mist">Eingegangen</dt>
          <dd className="text-foam">
            {formatStamp(r.created_at)} · {r.locale === "en" ? "Englisch" : "Deutsch"}
          </dd>
        </div>
      </dl>

      {r.message && (
        <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-trench p-4 text-sm leading-relaxed text-foam/90">
          {r.message}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-foam/10 pt-5 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-2">
          {NEXT_STEPS[r.status]?.map((step) => (
            <form key={step.status} action={setReservationStatus}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value={step.status} />
              <Submit variant={step.variant}>{step.label}</Submit>
            </form>
          ))}
        </div>
        <form action={saveReservationNote} className="flex flex-1 gap-2">
          <input type="hidden" name="id" value={r.id} />
          <input
            name="note"
            defaultValue={r.admin_note}
            placeholder="Interne Notiz"
            aria-label="Interne Notiz"
            maxLength={2000}
            className={INPUT}
          />
          <Submit variant="ghost">Speichern</Submit>
        </form>
        <form action={deleteReservation}>
          <input type="hidden" name="id" value={r.id} />
          <Submit variant="danger" confirm={`Reservierung von ${r.name} endgültig löschen?`}>
            Löschen
          </Submit>
        </form>
      </div>
    </article>
  );
}
