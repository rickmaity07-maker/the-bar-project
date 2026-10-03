import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { formatDate, OCCASION_LABEL } from "@/lib/admin-format";
import type { ReservationInput } from "@/lib/reservation";

/*
  Booking notifications by email, set up like the Atlantic site: a Gmail
  account with 2-Step Verification and an App Password
  (myaccount.google.com/apppasswords). SMTP_HOST switches to any other mail
  server with the same user and password variables.
*/
let transporter: Transporter | null = null;

export function isMailerConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.RESERVATION_NOTIFY_EMAIL);
}

export function getMailer(): Transporter {
  const auth = { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD };
  transporter ??= process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_PORT === "465",
        auth,
      })
    : nodemailer.createTransport({ service: "gmail", auth });
  return transporter;
}

export const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/* Tells the bar about a new request. Never throws: a failed email must not lose the booking. */
export async function notifyNewReservation(input: ReservationInput, adminUrl: string) {
  if (!isMailerConfigured()) return;

  const guests = `${input.guests} ${input.guests === "1" ? "Gast" : "Gäste"}`;
  const when = `${formatDate(input.date)}, ${input.time}${input.endTime ? ` bis ${input.endTime}` : ""} Uhr`;
  const subject = input.isPrivate
    ? `Private Veranstaltung angefragt: ${input.name}, ${formatDate(input.date)}`
    : `Neue Reservierung: ${input.name}, ${formatDate(input.date)} ${input.time}, ${guests}`;

  const rows: [string, string][] = [
    ["Art", input.isPrivate ? "Private Buchung der gesamten Bar" : "Tisch"],
    ["Name", input.name],
    ["Telefon", input.phone],
    ["Datum", when],
    [input.isPrivate ? "Erwartete Gäste" : "Gäste", guests],
  ];
  if (input.isPrivate) {
    rows.push(["Anlass", OCCASION_LABEL[input.occasion] ?? input.occasion], ["E-Mail", input.email]);
    if (input.message) rows.push(["Nachricht", input.message]);
  }

  const text = [
    input.isPrivate ? "Neue Anfrage für eine private Veranstaltung." : "Neue Tischreservierung.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Bestätigen oder ablehnen: ${adminUrl}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#05090b;padding:24px;font-family:Helvetica,Arial,sans-serif;color:#e8efec">
<div style="max-width:560px;margin:0 auto;background:#0a1317;border-radius:24px;padding:28px">
  <p style="margin:0;font-size:12px;letter-spacing:3px;color:#9db0b2">BAR-05</p>
  <h1 style="margin:8px 0 20px;font-size:24px;font-weight:600;color:#e8efec">${
    input.isPrivate ? "Private Veranstaltung angefragt" : "Neue Reservierung"
  }</h1>
  <table style="width:100%;border-collapse:collapse;font-size:15px">${rows
    .map(
      ([label, value]) => `<tr>
    <td style="padding:8px 12px 8px 0;color:#9db0b2;vertical-align:top;white-space:nowrap">${escape(label)}</td>
    <td style="padding:8px 0;color:#e8efec;white-space:pre-wrap">${escape(value)}</td></tr>`,
    )
    .join("")}</table>
  <a href="${escape(adminUrl)}" style="display:inline-block;margin-top:24px;background:#ff6a3d;color:#05090b;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;padding:14px 22px;border-radius:999px">IN DER VERWALTUNG ÖFFNEN</a>
</div></body></html>`;

  try {
    const info = await getMailer().sendMail({
      from: `${process.env.GMAIL_FROM_NAME ?? "Bar-05"} <${process.env.GMAIL_USER}>`,
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      // Replying goes straight to the guest when they left an address.
      replyTo: input.email || undefined,
      subject,
      text,
      html,
    });
    // Test servers such as Ethereal also return a link to view the message.
    const preview = nodemailer.getTestMessageUrl(info);
    console.info("Booking notification sent:", info.messageId, preview || "");
  } catch (error) {
    console.error("Booking notification email failed:", error);
  }
}

interface CancelledBooking {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  is_private: boolean;
}

/* Tells the bar that a guest cancelled from their profile, so the table can be given away. */
export async function notifyCancellation(booking: CancelledBooking, accountEmail: string) {
  if (!isMailerConfigured()) return;
  const kind = booking.is_private ? "Private Veranstaltung" : "Reservierung";
  const when = `${formatDate(booking.date)} ${booking.time} Uhr`;
  const lines = [
    `${kind} vom Gast storniert.`,
    "",
    `Name: ${booking.name}`,
    `Telefon: ${booking.phone}`,
    `Datum: ${when}`,
    `Gäste: ${booking.guests}`,
    `Konto: ${accountEmail}`,
  ];
  try {
    await getMailer().sendMail({
      from: `${process.env.GMAIL_FROM_NAME ?? "Bar-05"} <${process.env.GMAIL_USER}>`,
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: accountEmail,
      subject: `Storniert: ${booking.name}, ${when}`,
      text: lines.join("\n"),
      html: `<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">${lines
        .map((line) => escape(line) || "&nbsp;")
        .join("<br>")}</div>`,
    });
    console.info(`Cancellation email sent for ${booking.date}`);
  } catch (error) {
    console.error("Cancellation email failed:", error);
  }
}
