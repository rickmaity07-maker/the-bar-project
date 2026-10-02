export interface ReservationInput {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
}

/* Codes rather than sentences, so the form can show the message in the visitor's language. */
export type ReservationErrorCode = "name" | "phone" | "date" | "datePast" | "time" | "guests";

export type ReservationErrors = Partial<Record<keyof ReservationInput, ReservationErrorCode>>;

/* Shared by the form and the API route so both agree on what a valid request is. */
export function validateReservation(input: ReservationInput): ReservationErrors {
  const errors: ReservationErrors = {};

  if (input.name.trim().length < 2) errors.name = "name";

  if (input.phone.replace(/\D/g, "").length < 6) errors.phone = "phone";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = "date";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${input.date}T00:00:00`) < today) errors.date = "datePast";
  }

  if (!/^\d{2}:\d{2}$/.test(input.time)) errors.time = "time";

  const guests = Number(input.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) errors.guests = "guests";

  return errors;
}
