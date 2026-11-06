import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity";
import { createSession, getSession, safeNext } from "@/lib/auth";
import { db, hasDatabase } from "@/lib/db";
import { finishGoogleLogin, GOOGLE_STATE_COOKIE } from "@/lib/google";
import { isLoginBlocked, recordLoginFailure } from "@/lib/login-throttle";
import { ipKey } from "@/lib/security";

interface UserRow {
  id: string;
  email: string;
  role: "user" | "owner";
  active: boolean;
  google_sub: string | null;
}

interface Flow {
  state: string;
  verifier: string;
  next: string;
  link?: string;
}

/*
  Google sends the visitor back here. Linking policy:

  - An account already linked to this Google id signs in.
  - Linking mode (?link=1 from the profile): the signed-in account that started
    the flow gets this Google id, unless another account already has it.
  - Otherwise the verified email decides:
    - an owner account is never linked automatically. Owners sign in with their
      password and link Google from their profile, so a taken-over Google
      account alone never opens the admin portal;
    - a guest account is linked, and because nobody ever proved that whoever
      chose its password owned the address, that password is removed and every
      session of the account is ended (pre-account-takeover defence). The guest
      can set a new password in the profile;
    - an account linked to a different Google id is refused;
    - no account: a new guest account is created.
*/
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ip = ipKey(request.headers);
  const to = (path: string) => NextResponse.redirect(new URL(path, url), 303);
  const fail = async (error = "google") => {
    if (hasDatabase()) await recordLoginFailure("", ip);
    return to(`/login?error=${error}`);
  };

  const store = await cookies();
  const saved = store.get(GOOGLE_STATE_COOKIE)?.value;
  store.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });
  let flow: Flow;
  try {
    flow = JSON.parse(saved ?? "");
  } catch {
    return fail();
  }
  const code = url.searchParams.get("code");
  if (!hasDatabase() || !code || typeof flow?.state !== "string" || url.searchParams.get("state") !== flow.state) {
    return fail();
  }
  if (await isLoginBlocked("", ip)) return to("/login?error=tooMany");

  const profile = await finishGoogleLogin(url.origin, code, flow.verifier);
  if (!profile) return fail();

  const sql = db();

  if (flow.link) {
    const me = await getSession();
    if (!me || me.id !== flow.link) return fail();
    const linked = (await sql`
      update users set google_sub = ${profile.sub}
      where id = ${me.id}
        and not exists (select 1 from users other where other.google_sub = ${profile.sub} and other.id <> ${me.id})
      returning id
    `) as { id: string }[];
    if (!linked[0]) return to("/profile?google=taken");
    await logActivity(me, "user.google_link", "user", me.id, `${me.email} (im Profil, ${profile.email})`);
    return to("/profile?google=linked");
  }

  const [bySub] = (await sql`
    select id, email, role, active, google_sub from users where google_sub = ${profile.sub}
  `) as UserRow[];
  let user = bySub;

  if (!user) {
    const [byEmail] = (await sql`
      select id, email, role, active, google_sub from users where email = ${profile.email}
    `) as UserRow[];
    if (byEmail) {
      if (!byEmail.active) return fail();
      if (byEmail.role === "owner" || byEmail.google_sub) return fail("googleLink");
      await sql.transaction([
        sql`update users set google_sub = ${profile.sub}, password_hash = '' where id = ${byEmail.id}`,
        sql`delete from sessions where user_id = ${byEmail.id}`,
      ]);
      await logActivity(byEmail, "user.google_link", "user", byEmail.id, `${byEmail.email} (Passwort entfernt)`);
      user = { ...byEmail, google_sub: profile.sub };
    }
  }

  if (user && !user.active) return fail();
  if (!user) {
    [user] = (await sql`
      insert into users (email, name, password_hash, google_sub)
      values (${profile.email}, ${profile.name.slice(0, 120)}, '', ${profile.sub})
      on conflict do nothing
      returning id, email, role, active, google_sub
    `) as UserRow[];
    if (!user) return fail();
    await logActivity({ id: user.id, email: user.email }, "user.signup", "user", user.id, "Google");
  }

  await logActivity({ id: user.id, email: user.email }, "user.signin", "user", user.id, "Google");
  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await createSession(user.id);
  const destination = safeNext(flow.next) || (user.role === "owner" ? "/admin" : "/profile");
  return to(destination);
}
