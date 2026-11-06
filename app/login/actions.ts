"use server";

import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import {
  burnPasswordCheck,
  createSession,
  destroySession,
  getSession,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  needsRehash,
  safeNext,
  verifyPassword,
} from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";
import { isValidEmail } from "@/lib/email";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "@/lib/login-throttle";
import { overLimit, requestIpKey } from "@/lib/security";

export type LoginError =
  | "credentials"
  | "emailInUse"
  | "email"
  | "password"
  | "tooMany"
  | "tooManySignups"
  | "unavailable";

/* Account sign-ups per IP address: plenty for a household, too few for a bot. */
const SIGNUP_LIMIT = { perIp: 5, windowSeconds: 60 * 60 };
export interface LoginState {
  error: LoginError | null;
  email: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: "user" | "owner";
  active: boolean;
}

/* Owners go to the admin portal, everyone else to their profile, unless they came from somewhere. */
const destination = (role: string, next: string) => next || (role === "owner" ? "/admin" : "/profile");

/* Sign in and sign up share one form; the submit button's name picks the mode. */
export async function authenticate(_previous: LoginState, form: FormData): Promise<LoginState> {
  const mode = form.get("mode") === "signup" ? "signup" : "signin";
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const next = safeNext(form.get("next"));

  if (!hasDatabase()) return { error: "unavailable", email: "" };
  if (!isValidEmail(email)) return { error: "email", email: "" };

  const ip = await requestIpKey();
  if (await isLoginBlocked(email, ip)) return { error: "tooMany", email };

  const sql = db();
  let user: UserRow | undefined;

  if (mode === "signup") {
    if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) return { error: "password", email };
    // Checked before scrypt runs, so a flood of sign-ups can neither fill the users table nor burn CPU and memory.
    if (await overLimit("signup:ip", ip, SIGNUP_LIMIT.perIp, SIGNUP_LIMIT.windowSeconds)) {
      return { error: "tooManySignups", email };
    }
    const created = (await sql`
      insert into users (email, name, password_hash)
      values (${email}, ${name}, ${await hashPassword(password)})
      on conflict (email) do nothing
      returning id, email, password_hash, role, active
    `) as UserRow[];
    user = created[0];
    if (!user) {
      // Counted like a failure, so the sign-up form cannot be used to list registered addresses quickly.
      await recordLoginFailure("", ip);
      return { error: "emailInUse", email };
    }
    await logActivity({ id: user.id, email }, "user.signup", "user", user.id);
  } else {
    const rows = (await sql`
      select id, email, password_hash, role, active from users where email = ${email}
    `) as UserRow[];
    const candidate = rows[0];
    let valid = false;
    if (candidate) valid = await verifyPassword(password, candidate.password_hash);
    else await burnPasswordCheck(password);
    if (!candidate || !valid || !candidate.active) {
      await recordLoginFailure(email, ip);
      return { error: "credentials", email };
    }
    user = candidate;
    // Hashes from before the stronger scrypt settings are rewritten while the plain password is at hand.
    if (needsRehash(candidate.password_hash)) {
      await sql`update users set password_hash = ${await hashPassword(password)} where id = ${user.id}`;
    }
    await logActivity({ id: user.id, email }, "user.signin", "user", user.id, "Passwort");
  }

  // Only this address's failures from this IP are cleared; other IPs and the IP count run out on their own.
  await clearLoginFailures(email, ip);
  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await createSession(user.id);
  redirect(destination(user.role, next));
}

export async function signOut() {
  const session = await getSession();
  await destroySession();
  if (session) await logActivity(session, "user.signout", "user", session.id);
  redirect("/");
}
