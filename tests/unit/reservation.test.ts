import { describe, expect, it } from "vitest";
import { berlinToday, validateReservation, type ReservationInput } from "@/lib/reservation";
import { DEFAULT_WEEK } from "@/lib/site";

const schedule = { week: DEFAULT_WEEK, closedDates: [] };
// Noon on Friday 2026-11-20 in Schweinfurt.
const NOW = new Date("2026-11-20T11:00:00Z");

/* The first date on or after `from` with the given open/closed state in the default week. */
function dayAfter(from: string, closed: boolean) {
  const day = new Date(`${from}T12:00:00Z`);
  while (DEFAULT_WEEK[day.getUTCDay()].closed !== closed) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}
const OPEN = dayAfter("2026-11-21", false);
const CLOSED = dayAfter("2026-11-21", true);

const valid = (over: Partial<ReservationInput> = {}): ReservationInput => ({
  name: "Test Gast",
  phone: "0170 1234567",
  date: OPEN,
  time: "20:00",
  guests: "4",
  isPrivate: false,
  occasion: "",
  endTime: "",
  email: "gast@example.com",
  message: "",
  ...over,
});

describe("berlinToday", () => {
  it("is already the next day in Germany late in the UTC evening", () => {
    expect(berlinToday(new Date("2026-11-20T23:30:00Z"))).toBe("2026-11-21"); // winter, UTC+1
    expect(berlinToday(new Date("2026-07-20T22:30:00Z"))).toBe("2026-07-21"); // summer, UTC+2
    expect(berlinToday(NOW)).toBe("2026-11-20");
  });
});

describe("validateReservation", () => {
  it("accepts a normal table request", () => {
    expect(validateReservation(valid(), schedule, NOW)).toEqual({});
  });

  it("refuses impossible dates and times", () => {
    const errors = validateReservation(valid({ date: "2026-02-30", time: "25:00" }), schedule, NOW);
    expect(errors).toMatchObject({ date: "date", time: "time" });
  });

  it("refuses a day that has already passed in Germany while UTC is still on it", () => {
    // 00:30 on Saturday in Schweinfurt is 23:30 on Friday in UTC.
    expect(validateReservation(valid({ date: "2026-11-20" }), schedule, new Date("2026-11-20T23:30:00Z")).date).toBe("datePast");
  });

  it("refuses dates more than two years ahead", () => {
    expect(validateReservation(valid({ date: "2028-12-01" }), schedule, NOW).date).toBe("date");
  });

  it("refuses closed weekdays and the bar's closed dates", () => {
    expect(validateReservation(valid({ date: CLOSED }), schedule, NOW).date).toBe("closed");
    const holiday = { ...schedule, closedDates: [{ date: OPEN, reason: "Urlaub" }] };
    expect(validateReservation(valid(), holiday, NOW).date).toBe("closed");
  });

  it("limits the number of guests for tables and private events", () => {
    for (const guests of ["13", "2.5", "0", "-1", "zwei"]) {
      expect(validateReservation(valid({ guests }), schedule, NOW).guests).toBe("guests");
    }
    const privateEvent = valid({ guests: "80", isPrivate: true, occasion: "birthday", endTime: "23:00" });
    expect(validateReservation(privateEvent, schedule, NOW)).toEqual({});
    expect(validateReservation({ ...privateEvent, guests: "501" }, schedule, NOW).guests).toBe("guestsPrivate");
  });

  it("checks the extra fields of a private event", () => {
    const errors = validateReservation(
      valid({ isPrivate: true, occasion: "rave", endTime: "", email: "nope", message: "x".repeat(1001) }),
      schedule,
      NOW,
    );
    expect(errors).toMatchObject({ occasion: "occasion", endTime: "endTime", email: "email", message: "message" });
  });

  it("refuses a too short name and a phone number without enough digits", () => {
    expect(validateReservation(valid({ name: "A", phone: "abc" }), schedule, NOW)).toMatchObject({ name: "name", phone: "phone" });
  });
});
