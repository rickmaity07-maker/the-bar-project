import "server-only";
import { db } from "@/lib/db";

/*
  Failed sign-ins are counted per email address (guessing one account's
  password) and per IP address (trying many accounts, or failing Google
  sign-ins). Both windows are 15 minutes; the privacy policy states the limits.
*/
export const LOGIN_LIMITS = {
  perEmail: 8,
  perIp: 30,
  window: "15 minutes",
} as const;

export async function isLoginBlocked(email: string, ipKey: string) {
  const [{ byEmail, byIp }] = (await db()`
    select
      count(*) filter (where ${email} <> '' and email = ${email})::int as "byEmail",
      count(*) filter (where ip_key = ${ipKey})::int as "byIp"
    from login_attempts
    where attempted_at > now() - ${LOGIN_LIMITS.window}::interval
      and (email = ${email} or ip_key = ${ipKey})
  `) as { byEmail: number; byIp: number }[];
  return byEmail >= LOGIN_LIMITS.perEmail || byIp >= LOGIN_LIMITS.perIp;
}

/* `email` is empty for a failed Google sign-in, which only counts against the IP address. */
export async function recordLoginFailure(email: string, ipKey: string) {
  await db()`insert into login_attempts (email, ip_key) values (${email}, ${ipKey})`;
}
