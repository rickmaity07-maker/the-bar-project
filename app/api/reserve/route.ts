import { validateReservation, type ReservationInput } from "@/lib/reservation";

/*
  Not connected yet: validates the request and acknowledges it.
  Nothing is stored or emailed yet. Connect a database or mailer here.
*/
export async function POST(request: Request) {
  let body: Partial<ReservationInput>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const input: ReservationInput = {
    name: String(body.name ?? ""),
    phone: String(body.phone ?? ""),
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    guests: String(body.guests ?? ""),
  };

  const errors = validateReservation(input);
  if (Object.keys(errors).length > 0) {
    return Response.json({ ok: false, errors }, { status: 422 });
  }

  return Response.json({ ok: true });
}
