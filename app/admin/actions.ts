"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { hashPassword, requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultMenu, FALLBACK_DRINK_IMAGE } from "@/lib/site";

/*
  Every action re-checks the session itself: server actions can be called with a
  plain POST, so the page guard alone is not enough.
*/

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["pending", "confirmed", "declined", "cancelled"] as const;

const text = (form: FormData, key: string, max = 500) => String(form.get(key) ?? "").trim().slice(0, max);
const checked = (form: FormData, key: string) => form.get(key) === "on";

/* Refreshes every admin page and, when the visible site changed, the homepage too. */
function refresh({ site = false } = {}) {
  revalidatePath("/admin", "layout");
  if (site) revalidatePath("/");
}

/* ---------- Reservations ---------- */

export async function setReservationStatus(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const status = text(form, "status") as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) return;

  const rows = (await db()`
    update reservations set status = ${status}, updated_at = now(), updated_by = ${me.id}
    where id = ${id}
    returning name, date::text as date
  `) as { name: string; date: string }[];
  if (rows[0]) await logActivity(me, `reservation.${status}`, "reservation", id, `${rows[0].name}, ${rows[0].date}`);
  refresh();
}

export async function saveReservationNote(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const note = text(form, "note", 2000);
  await db()`update reservations set admin_note = ${note}, updated_at = now(), updated_by = ${me.id} where id = ${id}`;
  await logActivity(me, "reservation.note", "reservation", id, note);
  refresh();
}

export async function deleteReservation(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const rows = (await db()`
    delete from reservations where id = ${id} returning name, date::text as date
  `) as { name: string; date: string }[];
  if (rows[0]) await logActivity(me, "reservation.delete", "reservation", id, `${rows[0].name}, ${rows[0].date}`);
  refresh();
}

/* ---------- Menu ---------- */

export async function importDefaultMenu() {
  const me = await requireOwner();
  const sql = db();
  const [{ count }] = (await sql`select count(*)::int as count from menu_categories`) as { count: number }[];
  if (count > 0) return;

  const menu = defaultMenu();
  for (const [c, category] of menu.entries()) {
    const [{ id }] = (await sql`
      insert into menu_categories (sort, name_de, name_en, line_de, line_en)
      values (${c}, ${category.name.de}, ${category.name.en}, ${category.line.de}, ${category.line.en})
      returning id
    `) as { id: string }[];
    await sql.transaction(
      category.items.map(
        (item, i) => sql`
          insert into menu_items (category_id, sort, name_de, name_en, note_de, note_en, price, image)
          values (${id}, ${i}, ${item.name.de}, ${item.name.en}, ${item.note.de}, ${item.note.en}, ${item.price}, ${item.image})
        `,
      ),
    );
  }
  await logActivity(me, "menu.import", "menu", "", `${menu.length} Kategorien`);
  refresh({ site: true });
}

export async function saveCategory(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const fields = {
    nameDe: text(form, "name_de", 80),
    nameEn: text(form, "name_en", 80),
    lineDe: text(form, "line_de"),
    lineEn: text(form, "line_en"),
    visible: checked(form, "visible"),
  };
  if (!fields.nameDe) return;
  const sql = db();

  if (id) {
    await sql`
      update menu_categories
      set name_de = ${fields.nameDe}, name_en = ${fields.nameEn}, line_de = ${fields.lineDe},
          line_en = ${fields.lineEn}, visible = ${fields.visible}
      where id = ${id}
    `;
    await logActivity(me, "menu.category.update", "menu_category", id, fields.nameDe);
  } else {
    const [{ id: created }] = (await sql`
      insert into menu_categories (sort, name_de, name_en, line_de, line_en, visible)
      values ((select coalesce(max(sort), -1) + 1 from menu_categories), ${fields.nameDe}, ${fields.nameEn},
              ${fields.lineDe}, ${fields.lineEn}, true)
      returning id
    `) as { id: string }[];
    await logActivity(me, "menu.category.create", "menu_category", created, fields.nameDe);
  }
  refresh({ site: true });
}

export async function deleteCategory(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const rows = (await db()`delete from menu_categories where id = ${id} returning name_de`) as { name_de: string }[];
  if (rows[0]) await logActivity(me, "menu.category.delete", "menu_category", id, rows[0].name_de);
  refresh({ site: true });
}

/* Swaps an entry with its neighbour and renumbers the list, so gaps in `sort` never matter. */
async function move(table: "menu_categories" | "menu_items", id: string, direction: string, categoryId?: string) {
  const sql = db();
  const rows = (
    table === "menu_categories"
      ? await sql`select id from menu_categories order by sort, name_de`
      : await sql`select id from menu_items where category_id = ${categoryId} order by sort, name_de`
  ) as { id: string }[];
  const ids = rows.map((row) => row.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await sql.transaction(
    ids.map((entry, index) =>
      table === "menu_categories"
        ? sql`update menu_categories set sort = ${index} where id = ${entry}`
        : sql`update menu_items set sort = ${index} where id = ${entry}`,
    ),
  );
}

export async function moveCategory(form: FormData) {
  const me = await requireOwner();
  await move("menu_categories", text(form, "id"), text(form, "direction"));
  await logActivity(me, "menu.category.move", "menu_category", text(form, "id"), text(form, "direction"));
  refresh({ site: true });
}

export async function saveItem(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const categoryId = text(form, "category_id");
  const fields = {
    nameDe: text(form, "name_de", 120),
    nameEn: text(form, "name_en", 120),
    noteDe: text(form, "note_de"),
    noteEn: text(form, "note_en"),
    price: text(form, "price", 40),
    visible: checked(form, "visible"),
  };
  if (!fields.nameDe || !fields.price) return;
  const sql = db();

  if (id) {
    const before = (await sql`select price from menu_items where id = ${id}`) as { price: string }[];
    await sql`
      update menu_items
      set name_de = ${fields.nameDe}, name_en = ${fields.nameEn}, note_de = ${fields.noteDe},
          note_en = ${fields.noteEn}, price = ${fields.price}, visible = ${fields.visible}
      where id = ${id}
    `;
    const priceChange = before[0] && before[0].price !== fields.price ? `: ${before[0].price} → ${fields.price}` : "";
    await logActivity(me, "menu.item.update", "menu_item", id, `${fields.nameDe}${priceChange}`);
  } else {
    const [{ id: created }] = (await sql`
      insert into menu_items (category_id, sort, name_de, name_en, note_de, note_en, price, image, visible)
      values (${categoryId}, (select coalesce(max(sort), -1) + 1 from menu_items where category_id = ${categoryId}),
              ${fields.nameDe}, ${fields.nameEn}, ${fields.noteDe}, ${fields.noteEn}, ${fields.price},
              coalesce((select image from menu_items where category_id = ${categoryId} order by sort limit 1), ${FALLBACK_DRINK_IMAGE}),
              true)
      returning id
    `) as { id: string }[];
    await logActivity(me, "menu.item.create", "menu_item", created, `${fields.nameDe}, ${fields.price}`);
  }
  refresh({ site: true });
}

export async function deleteItem(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const rows = (await db()`delete from menu_items where id = ${id} returning name_de`) as { name_de: string }[];
  if (rows[0]) await logActivity(me, "menu.item.delete", "menu_item", id, rows[0].name_de);
  refresh({ site: true });
}

export async function moveItem(form: FormData) {
  const me = await requireOwner();
  await move("menu_items", text(form, "id"), text(form, "direction"), text(form, "category_id"));
  await logActivity(me, "menu.item.move", "menu_item", text(form, "id"), text(form, "direction"));
  refresh({ site: true });
}

/* ---------- Opening hours ---------- */

export async function saveHours(form: FormData) {
  const me = await requireOwner();
  const sql = db();
  const queries = [];
  const summary: string[] = [];
  for (let day = 0; day < 7; day++) {
    const closed = checked(form, `closed_${day}`);
    const opens = text(form, `opens_${day}`);
    const closes = text(form, `closes_${day}`);
    if (!closed && (!TIME.test(opens) || !TIME.test(closes))) continue;
    const open = TIME.test(opens) ? opens : "18:00";
    const close = TIME.test(closes) ? closes : "00:00";
    queries.push(sql`
      insert into opening_hours (weekday, closed, opens, closes)
      values (${day}, ${closed}, ${open}, ${close})
      on conflict (weekday) do update set closed = excluded.closed, opens = excluded.opens, closes = excluded.closes
    `);
    summary.push(`${day}:${closed ? "zu" : `${open}-${close}`}`);
  }
  if (queries.length) await sql.transaction(queries);
  await logActivity(me, "hours.update", "opening_hours", "", summary.join(" "));
  refresh({ site: true });
}

export async function addClosedDate(form: FormData) {
  const me = await requireOwner();
  const date = text(form, "date");
  const reason = text(form, "reason", 200);
  if (!DATE.test(date)) return;
  await db()`
    insert into closed_dates (date, reason) values (${date}, ${reason})
    on conflict (date) do update set reason = excluded.reason
  `;
  await logActivity(me, "hours.closed_date.add", "closed_date", date, reason);
  refresh({ site: true });
}

export async function removeClosedDate(form: FormData) {
  const me = await requireOwner();
  const date = text(form, "date");
  if (!DATE.test(date)) return;
  await db()`delete from closed_dates where date = ${date}`;
  await logActivity(me, "hours.closed_date.remove", "closed_date", date);
  refresh({ site: true });
}

/* ---------- Users and roles ---------- */

function usersPage(notice: string): never {
  redirect(`/admin/users?notice=${notice}`);
}

async function activeOwnerCount() {
  const [{ count }] = (await db()`
    select count(*)::int as count from users where role = 'owner' and active
  `) as { count: number }[];
  return count;
}

export async function createUser(form: FormData) {
  const me = await requireOwner();
  const email = text(form, "email", 200).toLowerCase();
  const name = text(form, "name", 120);
  const password = String(form.get("password") ?? "");
  const role = text(form, "role") === "owner" ? "owner" : "user";
  if (!EMAIL.test(email)) usersPage("email");
  if (password.length < 8) usersPage("password");

  const rows = (await db()`
    insert into users (email, name, password_hash, role)
    values (${email}, ${name}, ${await hashPassword(password)}, ${role})
    on conflict (email) do nothing
    returning id
  `) as { id: string }[];
  if (!rows[0]) usersPage("exists");
  await logActivity(me, "user.create", "user", rows[0].id, `${email} (${role})`);
  refresh();
  usersPage("created");
}

export async function setUserRole(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const role = text(form, "role") === "owner" ? "owner" : "user";
  if (id === me.id && role !== "owner") usersPage("self");
  if (role === "user" && (await activeOwnerCount()) <= 1) {
    const target = (await db()`select role from users where id = ${id}`) as { role: string }[];
    if (target[0]?.role === "owner") usersPage("lastOwner");
  }
  const rows = (await db()`update users set role = ${role} where id = ${id} returning email`) as { email: string }[];
  if (rows[0]) await logActivity(me, "user.role", "user", id, `${rows[0].email} → ${role}`);
  refresh();
  usersPage("saved");
}

export async function setUserActive(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const active = text(form, "active") === "true";
  if (id === me.id && !active) usersPage("self");
  const sql = db();
  const rows = (await sql`update users set active = ${active} where id = ${id} returning email`) as { email: string }[];
  // Signing a deactivated account out everywhere at once.
  if (!active) await sql`delete from sessions where user_id = ${id}`;
  if (rows[0]) await logActivity(me, active ? "user.activate" : "user.deactivate", "user", id, rows[0].email);
  refresh();
  usersPage("saved");
}

export async function resetPassword(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const password = String(form.get("password") ?? "");
  if (password.length < 8) usersPage("password");
  const sql = db();
  const rows = (await sql`
    update users set password_hash = ${await hashPassword(password)} where id = ${id} returning email
  `) as { email: string }[];
  // Other devices must sign in again with the new password; the owner's own session survives.
  if (id !== me.id) await sql`delete from sessions where user_id = ${id}`;
  if (rows[0]) await logActivity(me, "user.password", "user", id, rows[0].email);
  usersPage("password-reset");
}
