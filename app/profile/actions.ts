"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { logActivity } from "@/lib/activity";
import {
  destroySession,
  hashPassword,
  MAX_PASSWORD_LENGTH,
  requireUser,
  revokeOtherSessions,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyCancellation } from "@/lib/mailer";
import { isUuid, OWNER_LOCK, overLimit } from "@/lib/security";

export type ProfileError = "name" | "phone" | "wrongPassword" | "password" | "tooMany";

/* Password changes per account: a stolen session cannot be used to guess the current password at scrypt speed. */
const PASSWORD_LIMIT = { perUser: 5, windowSeconds: 15 * 60 };
export interface ProfileState {
  error: ProfileError | null;
  done: boolean;
}

export async function updateProfile(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
  if (name.length < 2) return { error: "name", done: false };
  if (phone && phone.replace(/\D/g, "").length < 6) return { error: "phone", done: false };

  await db()`update users set name = ${name}, phone = ${phone} where id = ${me.id}`;
  await logActivity(me, "user.profile", "user", me.id, `${name}, ${phone}`);
  revalidatePath("/profile");
  return { error: null, done: true };
}

export async function changePassword(_previous: ProfileState, form: FormData): Promise<ProfileState> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (await overLimit("password:user", me.id, PASSWORD_LIMIT.perUser, PASSWORD_LIMIT.windowSeconds)) {
    return { error: "tooMany", done: false };
  }
  const sql = db();
  const [row] = (await sql`select password_hash from users where id = ${me.id}`) as { password_hash: string }[];
  if (!row) return { error: "wrongPassword", done: false };
  // Accounts created through Google have no password yet; they may set one directly.
  if (row.password_hash && !(await verifyPassword(current, row.password_hash))) {
    return { error: "wrongPassword", done: false };
  }
  if (next.length < 8 || next.length > MAX_PASSWORD_LENGTH) return { error: "password", done: false };

  await sql`update users set password_hash = ${await hashPassword(next)} where id = ${me.id}`;
  await revokeOtherSessions(me.id);
  await logActivity(me, "user.password", "user", me.id, `${me.email} (selbst)`);
  return { error: null, done: true };
}

/* A guest can cancel their own request or confirmed booking, as long as the day has not passed. */
export async function cancelMyReservation(form: FormData) {
  const me = await requireUser();
  const id = String(form.get("id") ?? "");
  if (!isUuid(id)) return;
  const rows = (await db()`
    update reservations set status = 'cancelled', updated_at = now(), updated_by = ${me.id}
    where id = ${id} and user_id = ${me.id} and status in ('pending', 'confirmed')
      and date >= (now() at time zone 'Europe/Berlin')::date
    returning name, phone, date::text as date, to_char(time, 'HH24:MI') as time, guests, is_private
  `) as { name: string; phone: string; date: string; time: string; guests: number; is_private: boolean }[];
  if (!rows[0]) return;

  await logActivity(me, "reservation.cancelled", "reservation", id, `${rows[0].name}, ${rows[0].date} (vom Gast)`);
  after(() => notifyCancellation(rows[0], me.email));
  revalidatePath("/profile");
  revalidatePath("/admin", "layout");
}

/* Google can only be unlinked while a password is set, so the account never ends up without a way in. */
export async function unlinkGoogle() {
  const me = await requireUser();
  const rows = (await db()`
    update users set google_sub = null
    where id = ${me.id} and google_sub is not null and password_hash <> ''
    returning id
  `) as { id: string }[];
  if (rows[0]) await logActivity(me, "user.google_unlink", "user", me.id, me.email);
  revalidatePath("/profile");
  redirect(rows[0] ? "/profile?google=unlinked" : "/profile");
}

export type DeleteError = "lastOwner" | "confirm";

/*
  Right to erasure (Art. 17 DSGVO): removes the account, its sessions and its
  bookings, and replaces the address in the activity log. The bar is told about
  upcoming bookings that disappear with it, so no table is kept for nobody.
*/
export async function deleteMyAccount(_previous: DeleteError | null, form: FormData): Promise<DeleteError | null> {
  const me = await requireUser();
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== me.email.toLowerCase()) return "confirm";
  const sql = db();
  if (me.role === "owner") {
    const [{ count }] = (await sql`select count(*)::int as count from users where role = 'owner' and active`) as { count: number }[];
    if (count <= 1) return "lastOwner";
  }

  const upcoming = (await sql`
    select name, phone, date::text as date, to_char(time, 'HH24:MI') as time, guests, is_private
    from reservations
    where user_id = ${me.id} and status in ('pending', 'confirmed')
      and date >= (now() at time zone 'Europe/Berlin')::date
  `) as { name: string; phone: string; date: string; time: string; guests: number; is_private: boolean }[];

  /*
    The check above is only the quick answer. Two owners deleting themselves at
    once could both pass it, so the transaction takes the same advisory lock as
    role changes in the admin portal (OWNER_LOCK) and every statement repeats
    the check: if this is the last active owner, nothing is changed.
  */
  const [, , , , removed] = (await sql.transaction([
    sql`select pg_advisory_xact_lock(${OWNER_LOCK})`,
    sql`
      delete from reservations where user_id = ${me.id}
        and not exists (
          select 1 from users self where self.id = ${me.id} and self.role = 'owner' and self.active
            and not exists (select 1 from users o where o.role = 'owner' and o.active and o.id <> ${me.id})
        )
    `,
    sql`
      update activity_log set user_email = 'gelöschtes Konto', detail = '' where user_id = ${me.id}
        and not exists (
          select 1 from users self where self.id = ${me.id} and self.role = 'owner' and self.active
            and not exists (select 1 from users o where o.role = 'owner' and o.active and o.id <> ${me.id})
        )
    `,
    sql`
      delete from login_attempts where email = ${me.email}
        and not exists (
          select 1 from users self where self.id = ${me.id} and self.role = 'owner' and self.active
            and not exists (select 1 from users o where o.role = 'owner' and o.active and o.id <> ${me.id})
        )
    `,
    sql`
      delete from users where id = ${me.id}
        and not (
          role = 'owner' and active
          and not exists (select 1 from users o where o.role = 'owner' and o.active and o.id <> ${me.id})
        )
      returning id
    `,
  ])) as [unknown, unknown, unknown, unknown, { id: string }[]];
  if (!removed[0]) return "lastOwner";
  await logActivity(null, "user.deleted", "user", "", `${upcoming.length} offene Reservierungen entfernt`);
  for (const booking of upcoming) after(() => notifyCancellation(booking, "gelöschtes Konto"));

  await destroySession();
  revalidatePath("/admin", "layout");
  redirect("/?konto=geloescht");
}
