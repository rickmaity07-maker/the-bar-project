import "server-only";
import { escape, getMailer, isMailerConfigured } from "@/lib/mailer";
import { VENUE } from "@/lib/data";

/*
  Emails to the guest about their own booking, in the language they booked in:
  the request was received, then confirmed, declined or cancelled by the bar.
*/
export type GuestMailKind = "received" | "confirmed" | "declined" | "cancelled";

export interface GuestBooking {
  name: string;
  email: string;
  date: string;
  time: string;
  end_time: string | null;
  guests: number;
  is_private: boolean;
  locale: string;
}

const COPY = {
  de: {
    subject: {
      received: "Anfrage erhalten",
      confirmed: "Reservierung bestätigt",
      declined: "Reservierung leider nicht möglich",
      cancelled: "Reservierung storniert",
    },
    heading: {
      received: "Danke, eure Anfrage ist da.",
      confirmed: "Euer Tisch ist bestätigt.",
      declined: "Leider klappt es diesmal nicht.",
      cancelled: "Eure Reservierung wurde storniert.",
    },
    body: {
      received: "Wir prüfen sie und schicken euch eine weitere E-Mail, sobald sie bestätigt ist.",
      confirmed: "Wir freuen uns auf euch. Falls sich etwas ändert, storniert bitte im Profil oder ruft uns an.",
      declined: "Zu dieser Zeit können wir euch leider keinen Platz anbieten. Ruft uns gern an, dann finden wir eine andere Zeit.",
      cancelled: "Die Bar hat diese Reservierung storniert. Bei Fragen ruft uns bitte an.",
    },
    privateEvent: "Private Veranstaltung (gesamte Bar)",
    table: "Tisch",
    labels: { kind: "Art", date: "Datum", time: "Uhrzeit", guests: "Gäste" },
    guests: (n: number) => (n === 1 ? "1 Gast" : `${n} Gäste`),
    at: (time: string, end: string | null) => (end ? `${time} bis ${end} Uhr` : `${time} Uhr`),
    profile: "Im Profil ansehen",
    phone: "Telefon",
    dateLocale: "de-DE",
  },
  en: {
    subject: {
      received: "Request received",
      confirmed: "Booking confirmed",
      declined: "Booking not possible",
      cancelled: "Booking cancelled",
    },
    heading: {
      received: "Thanks, we have your request.",
      confirmed: "Your table is confirmed.",
      declined: "Sorry, this time it does not work out.",
      cancelled: "Your booking has been cancelled.",
    },
    body: {
      received: "We will check it and send you another email as soon as it is confirmed.",
      confirmed: "We look forward to seeing you. If anything changes, please cancel on your profile or give us a call.",
      declined: "We cannot offer you a place at that time. Give us a call and we will find another time.",
      cancelled: "The bar has cancelled this booking. If you have any questions, please call us.",
    },
    privateEvent: "Private event (whole bar)",
    table: "Table",
    labels: { kind: "Type", date: "Date", time: "Time", guests: "Guests" },
    guests: (n: number) => (n === 1 ? "1 guest" : `${n} guests`),
    at: (time: string, end: string | null) => (end ? `${time} to ${end}` : time),
    profile: "View on your profile",
    phone: "Phone",
    dateLocale: "en-GB",
  },
};

/* Never throws: an email problem must not undo the change in the portal. */
export async function notifyGuest(kind: GuestMailKind, booking: GuestBooking, origin: string) {
  if (!isMailerConfigured() || !booking.email) return;
  const c = booking.locale === "en" ? COPY.en : COPY.de;
  const date = new Date(`${booking.date}T12:00:00Z`).toLocaleDateString(c.dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const rows: [string, string][] = [
    [c.labels.kind, booking.is_private ? c.privateEvent : c.table],
    [c.labels.date, date],
    [c.labels.time, c.at(booking.time, booking.end_time)],
    [c.labels.guests, c.guests(booking.guests)],
  ];
  const profileUrl = `${origin}/profile`;
  const subject = `${c.subject[kind]} – ${booking.name}, ${date}, ${booking.time}`;
  const text = [
    c.heading[kind],
    "",
    c.body[kind],
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `${c.profile}: ${profileUrl}`,
    `${c.phone}: ${VENUE.phone}`,
    "Bar-05, Kornmarkt 7, 97421 Schweinfurt",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#05090b;padding:24px;font-family:Helvetica,Arial,sans-serif;color:#e8efec">
<div style="max-width:560px;margin:0 auto;background:#0a1317;border-radius:24px;padding:28px">
  <p style="margin:0;font-size:12px;letter-spacing:3px;color:#9db0b2">BAR-05</p>
  <h1 style="margin:8px 0 12px;font-size:24px;font-weight:600;color:#e8efec">${escape(c.heading[kind])}</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#e8efec">${escape(c.body[kind])}</p>
  <table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      ([label, value]) => `<tr>
    <td style="padding:8px 12px 8px 0;color:#9db0b2;white-space:nowrap">${escape(label)}</td>
    <td style="padding:8px 0;color:#e8efec">${escape(value)}</td></tr>`,
    )
    .join("")}</table>
  <a href="${escape(profileUrl)}" style="display:inline-block;margin-top:24px;background:#ff6a3d;color:#05090b;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;padding:14px 22px;border-radius:999px">${escape(c.profile.toUpperCase())}</a>
  <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#9db0b2">${escape(c.phone)}: ${escape(VENUE.phone)}<br>Bar-05, Kornmarkt 7, 97421 Schweinfurt</p>
</div></body></html>`;

  try {
    await getMailer().sendMail({
      from: `${process.env.GMAIL_FROM_NAME ?? "Bar-05"} <${process.env.GMAIL_USER}>`,
      to: booking.email,
      subject,
      text,
      html,
    });
    console.info(`Guest email sent (${kind}):`, booking.name, booking.date);
  } catch (error) {
    console.error(`Guest email failed (${kind}):`, error);
  }
}
