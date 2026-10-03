import { after } from "next/server";
import { getSession } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";
import { notifyNewReservation } from "@/lib/mailer";
import { validateReservation, type ReservationInput } from "@/lib/reservation";
import { getSiteData } from "@/lib/site-data";

/*
  Validates a reservation request, stores it as "pending" under the signed-in
  account and emails the bar about it. Booking needs an account.
*/
export async function POST(request: Request) {
  const account = await getSession();
  if (!account) return Response.json({ ok: false, message: "Sign in to book." }, { status: 401 });

  let body: Partial<Record<keyof ReservationInput | "locale", unknown>>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const isPrivate = body.isPrivate === true;
  const text = (value: unknown) => String(value ?? "").trim();
  const input: ReservationInput = {
    name: text(body.name),
    phone: text(body.phone),
    date: text(body.date),
    time: text(body.time),
    guests: text(body.guests),
    isPrivate,
    // The private-event fields are ignored for an ordinary table.
    occasion: isPrivate ? text(body.occasion) : "",
    endTime: isPrivate ? text(body.endTime) : "",
    // Private events can name a different contact address; tables use the account's.
    email: isPrivate ? text(body.email) : account.email,
    message: isPrivate ? text(body.message) : "",
  };

  const errors = validateReservation(input, await getSiteData());
  if (Object.keys(errors).length > 0) {
    return Response.json({ ok: false, errors }, { status: 422 });
  }

  // Without a database nothing would reach the bar, so say so instead of pretending.
  if (!hasDatabase()) {
    return Response.json({ ok: false, message: "Reservations are not connected." }, { status: 503 });
  }

  try {
    const sql = db();
    await sql`
      insert into reservations
        (user_id, name, phone, email, date, time, end_time, guests, is_private, occasion, message, locale)
      values
        (${account.id}, ${input.name}, ${input.phone}, ${input.email}, ${input.date}, ${input.time},
         ${input.endTime || null}, ${Number(input.guests)}, ${isPrivate}, ${input.occasion},
         ${input.message}, ${body.locale === "en" ? "en" : "de"})
    `;
    // The first booking fills in the profile, so the next form is already complete.
    await sql`
      update users set
        phone = case when phone = '' then ${input.phone} else phone end,
        name = case when name = '' then ${input.name} else name end
      where id = ${account.id}
    `;
  } catch (error) {
    console.error("Reservation could not be stored:", error);
    return Response.json({ ok: false, message: "Could not store the reservation." }, { status: 500 });
  }

  // Sent after the response, so the guest never waits for the mail server.
  const adminUrl = new URL("/admin/reservations?status=pending", request.url).toString();
  after(() => notifyNewReservation(input, adminUrl));

  return Response.json({ ok: true });
}
