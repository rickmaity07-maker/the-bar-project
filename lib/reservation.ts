import { isClosedOn, type ClosedDate, type DayHours } from "@/lib/site";

export const OCCASIONS = ["birthday", "company", "wedding", "other"] as const;
export type Occasion = (typeof OCCASIONS)[number];

export interface ReservationInput {
  name: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  /* Whole-bar booking for a private event. The fields below only apply when it is set. */
  isPrivate: boolean;
  occasion: string;
  endTime: string;
  email: string;
  message: string;
}

export type ReservationField = Exclude<keyof ReservationInput, "isPrivate">;

/* Codes rather than sentences, so the form can show the message in the visitor's language. */
export type ReservationErrorCode =
  | "name"
  | "phone"
  | "date"
  | "datePast"
  | "closed"
  | "time"
  | "guests"
  | "guestsPrivate"
  | "occasion"
  | "endTime"
  | "email"
  | "message";

export type ReservationErrors = Partial<Record<ReservationField, ReservationErrorCode>>;

export interface Schedule {
  week: DayHours[];
  closedDates: ClosedDate[];
}

export const MAX_TABLE_GUESTS = 12;
export const MAX_PRIVATE_GUESTS = 500;
export const MAX_MESSAGE_LENGTH = 1000;

const TIME = /^\d{2}:\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Shared by the form and the API route so both agree on what a valid request is. */
export function validateReservation(input: ReservationInput, schedule: Schedule): ReservationErrors {
  const errors: ReservationErrors = {};

  if (input.name.trim().length < 2) errors.name = "name";

  if (input.phone.replace(/\D/g, "").length < 6) errors.phone = "phone";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(`${input.date}T00:00:00`))) {
    errors.date = "date";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${input.date}T00:00:00`) < today) errors.date = "datePast";
    else if (isClosedOn(input.date, schedule.week, schedule.closedDates)) errors.date = "closed";
  }

  if (!TIME.test(input.time)) errors.time = "time";

  const guests = Number(input.guests);
  const maxGuests = input.isPrivate ? MAX_PRIVATE_GUESTS : MAX_TABLE_GUESTS;
  if (!Number.isInteger(guests) || guests < 1 || guests > maxGuests) {
    errors.guests = input.isPrivate ? "guestsPrivate" : "guests";
  }

  if (input.isPrivate) {
    if (!(OCCASIONS as readonly string[]).includes(input.occasion)) errors.occasion = "occasion";
    if (!TIME.test(input.endTime)) errors.endTime = "endTime";
    if (!EMAIL.test(input.email.trim())) errors.email = "email";
    if (input.message.length > MAX_MESSAGE_LENGTH) errors.message = "message";
  }

  return errors;
}
