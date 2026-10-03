import { after } from "next/server";
import { db, hasDatabase } from "@/lib/db";
import { notifyNewReservation } from "@/lib/mailer";
import { validateReservation, type ReservationInput } from "@/lib/reservation";
import { getSiteData } from "@/lib/site-data";

/* Validates a reservation request, stores it as "pending" and emails the bar about it. */
export async function POST(request: Request) {
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
    email: isPrivate ? text(body.email) : "",
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
    await db()`
      insert into reservations
        (name, phone, email, date, time, end_time, guests, is_private, occasion, message, locale)
      values
        (${input.name}, ${input.phone}, ${input.email}, ${input.date}, ${input.time},
         ${input.endTime || null}, ${Number(input.guests)}, ${isPrivate}, ${input.occasion},
         ${input.message}, ${body.locale === "en" ? "en" : "de"})
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
