import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";
import { stripControl } from "@/lib/email";
import { notifyGuest } from "@/lib/guest-mail";
import { notifyNewReservation } from "@/lib/mailer";
import { validateReservation, type ReservationInput } from "@/lib/reservation";
import { ipKey, isSameOrigin, overLimit, siteOrigin } from "@/lib/security";
import { getSiteData } from "@/lib/site-data";

/* Booking requests per hour: enough for a real guest, too few for a flood of fake tables. */
const LIMITS = { perAccount: 20, perIp: 60, windowSeconds: 60 * 60 };
const MAX_BODY_BYTES = 16 * 1024;

const refuse = (status: number, message: string) => Response.json({ ok: false, message }, { status });

/*
  Validates a reservation request, stores it as "pending" under the signed-in
  account and emails the bar about it. Booking needs an account.

  The session cookie is SameSite=Lax, which already keeps cross-site POSTs
  without it; the Origin check and the JSON-only rule close the rest (a form on
  another site cannot send application/json without a CORS preflight).
*/
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return refuse(403, "Cross-site request refused.");

  const account = await getSession();
  if (!account) return refuse(401, "Sign in to book.");

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return refuse(415, "Send JSON.");
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return refuse(413, "Request too large.");

  if (!hasDatabase()) {
    // Without a database nothing would reach the bar, so say so instead of pretending.
    return refuse(503, "Reservations are not connected.");
  }

  const ip = ipKey(request.headers);
  const [accountOver, ipOver] = await Promise.all([
    overLimit("reserve:account", account.id, LIMITS.perAccount, LIMITS.windowSeconds),
    overLimit("reserve:ip", ip, LIMITS.perIp, LIMITS.windowSeconds),
  ]);
  if (accountOver || ipOver) return refuse(429, "Too many booking requests. Please try again later.");

  let body: Partial<Record<keyof ReservationInput | "locale", unknown>>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return refuse(413, "Request too large.");
    body = JSON.parse(raw);
  } catch {
    return refuse(400, "Invalid request.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return refuse(400, "Invalid request.");

  const isPrivate = body.isPrivate === true;
  // Only strings and numbers count; objects or arrays become empty and fail validation.
  const text = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "");
  // Single-line fields lose control characters (CR/LF included), so none can reach a mail header or log line.
  const line = (value: unknown) => stripControl(text(value));
  const input: ReservationInput = {
    name: line(body.name),
    phone: line(body.phone),
    date: text(body.date),
    time: text(body.time),
    guests: text(body.guests),
    isPrivate,
    // The private-event fields are ignored for an ordinary table.
    occasion: isPrivate ? text(body.occasion) : "",
    endTime: isPrivate ? text(body.endTime) : "",
    // Private events can name a different contact address; tables use the account's.
    email: isPrivate ? line(body.email) : account.email,
    message: isPrivate ? text(body.message) : "",
  };

  const errors = validateReservation(input, await getSiteData());
  if (Object.keys(errors).length > 0) {
    return Response.json({ ok: false, errors }, { status: 422 });
  }

  const locale = body.locale === "en" ? "en" : "de";
  try {
    const sql = db();
    await sql`
      insert into reservations
        (user_id, name, phone, email, date, time, end_time, guests, is_private, occasion, message, locale)
      values
        (${account.id}, ${input.name}, ${input.phone}, ${input.email}, ${input.date}, ${input.time},
         ${input.endTime || null}, ${Number(input.guests)}, ${isPrivate}, ${input.occasion},
         ${input.message}, ${locale})
    `;
    // The first booking fills in the profile, so the next form is already complete.
    await sql`
      update users set
        phone = case when phone = '' then ${input.phone} else phone end,
        name = case when name = '' then ${input.name} else name end
      where id = ${account.id}
    `;
  } catch (error) {
    console.error("Reservation could not be stored:", error instanceof Error ? error.message : "unknown error");
    return refuse(500, "Could not store the reservation.");
  }

  // Links in emails use the configured site address, never a Host header the request chose.
  const origin = siteOrigin(new URL(request.url).origin);
  // Sent after the response, so the guest never waits for the mail server.
  after(() => notifyNewReservation(input, `${origin}/admin/reservations?status=pending`));
  // And a receipt to the guest, at the address the booking was made with.
  const booking = {
    name: input.name,
    email: input.email,
    date: input.date,
    time: input.time,
    end_time: input.endTime || null,
    guests: Number(input.guests),
    is_private: isPrivate,
    locale,
  };
  after(() => notifyGuest("received", booking, origin));

  return Response.json({ ok: true });
}
