import { isValidEmail } from "@/lib/email";
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

export const MAX_NAME_LENGTH = 120;
export const MAX_PHONE_LENGTH = 40;
export { MAX_EMAIL_LENGTH } from "@/lib/email";

/* A real clock time, so the database never sees "25:99". */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/* YYYY-MM-DD that names a real day (no 31 February). */
function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/* Shared by the form and the API route so both agree on what a valid request is. */
export function validateReservation(input: ReservationInput, schedule: Schedule): ReservationErrors {
  const errors: ReservationErrors = {};

  if (input.name.trim().length < 2 || input.name.length > MAX_NAME_LENGTH) errors.name = "name";

  if (input.phone.replace(/\D/g, "").length < 6 || input.phone.length > MAX_PHONE_LENGTH) errors.phone = "phone";

  if (!isCalendarDate(input.date)) {
    errors.date = "date";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(`${input.date}T00:00:00`);
    const latest = new Date(today);
    latest.setFullYear(latest.getFullYear() + 2);
    if (day < today) errors.date = "datePast";
    else if (day > latest) errors.date = "date";
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
    if (!isValidEmail(input.email.trim())) errors.email = "email";
    if (input.message.length > MAX_MESSAGE_LENGTH) errors.message = "message";
  }

  return errors;
}
