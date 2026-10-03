"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

/*
  Bar details, the nights programme and the gallery. Like every admin action,
  each one checks the owner session itself.
*/

const TIME = /^\d{2}:\d{2}$/;
const PHOTO = /^\/photos\/[\w.-]+\.jpg$/;
const RATIOS = ["aspect-[4/5]", "aspect-[16/11]", "aspect-square"];

const text = (form: FormData, key: string, max = 500) => String(form.get(key) ?? "").trim().slice(0, max);
const checked = (form: FormData, key: string) => form.get(key) === "on";

/* These are shown on the homepage, in the privacy policy and in emails. */
function refreshContent() {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/datenschutz");
}

export async function saveVenue(form: FormData) {
  const me = await requireOwner();
  const f = {
    name: text(form, "name", 80),
    contact: text(form, "contact_name", 120),
    street: text(form, "street", 120),
    city: text(form, "postal_city", 120),
    phone: text(form, "phone", 40),
    maps: text(form, "maps_url", 500),
  };
  if (!f.name || !f.street || !f.city || f.phone.replace(/\D/g, "").length < 6) return;
  if (f.maps && !f.maps.startsWith("https://")) return;
  await db()`
    insert into venue (id, name, contact_name, street, postal_city, phone, maps_url, updated_at)
    values (1, ${f.name}, ${f.contact}, ${f.street}, ${f.city}, ${f.phone}, ${f.maps}, now())
    on conflict (id) do update set name = excluded.name, contact_name = excluded.contact_name, street = excluded.street,
      postal_city = excluded.postal_city, phone = excluded.phone, maps_url = excluded.maps_url, updated_at = now()
  `;
  await logActivity(me, "venue.update", "venue", "1", `${f.street}, ${f.city}, ${f.phone}`);
  refreshContent();
}

/* Swaps an entry with its neighbour and renumbers, like the menu. */
async function reorder(table: "nights" | "gallery_photos", id: string, direction: string) {
  const sql = db();
  const rows = (
    table === "nights"
      ? await sql`select id from nights order by sort, day_de`
      : await sql`select id from gallery_photos order by sort`
  ) as { id: string }[];
  const ids = rows.map((row) => row.id);
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await sql.transaction(
    ids.map((entry, index) =>
      table === "nights"
        ? sql`update nights set sort = ${index} where id = ${entry}`
        : sql`update gallery_photos set sort = ${index} where id = ${entry}`,
    ),
  );
}

export async function saveNight(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const f = {
    dayDe: text(form, "day_de", 60),
    dayEn: text(form, "day_en", 60),
    titleDe: text(form, "title_de", 120),
    titleEn: text(form, "title_en", 120),
    bodyDe: text(form, "body_de", 600),
    bodyEn: text(form, "body_en", 600),
    altDe: text(form, "alt_de", 200),
    altEn: text(form, "alt_en", 200),
    opens: text(form, "opens"),
    closes: text(form, "closes"),
    image: text(form, "image", 200),
    visible: checked(form, "visible"),
  };
  if (!f.dayDe || !f.titleDe || !TIME.test(f.opens) || !TIME.test(f.closes) || !PHOTO.test(f.image)) return;
  const sql = db();
  if (id) {
    await sql`
      update nights set day_de = ${f.dayDe}, day_en = ${f.dayEn}, title_de = ${f.titleDe}, title_en = ${f.titleEn},
        body_de = ${f.bodyDe}, body_en = ${f.bodyEn}, alt_de = ${f.altDe}, alt_en = ${f.altEn},
        opens = ${f.opens}, closes = ${f.closes}, image = ${f.image}, visible = ${f.visible}
      where id = ${id}
    `;
    await logActivity(me, "night.update", "night", id, `${f.dayDe}: ${f.titleDe}`);
  } else {
    const [{ id: created }] = (await sql`
      insert into nights (sort, day_de, day_en, title_de, title_en, body_de, body_en, alt_de, alt_en, opens, closes, image)
      values ((select coalesce(max(sort), -1) + 1 from nights), ${f.dayDe}, ${f.dayEn}, ${f.titleDe}, ${f.titleEn},
              ${f.bodyDe}, ${f.bodyEn}, ${f.altDe}, ${f.altEn}, ${f.opens}, ${f.closes}, ${f.image})
      returning id
    `) as { id: string }[];
    await logActivity(me, "night.create", "night", created, `${f.dayDe}: ${f.titleDe}`);
  }
  refreshContent();
}

export async function deleteNight(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const rows = (await db()`delete from nights where id = ${id} returning day_de, title_de`) as {
    day_de: string;
    title_de: string;
  }[];
  if (rows[0]) await logActivity(me, "night.delete", "night", id, `${rows[0].day_de}: ${rows[0].title_de}`);
  refreshContent();
}

export async function moveNight(form: FormData) {
  const me = await requireOwner();
  await reorder("nights", text(form, "id"), text(form, "direction"));
  await logActivity(me, "night.move", "night", text(form, "id"), text(form, "direction"));
  refreshContent();
}

export async function saveGalleryPhoto(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const f = {
    src: text(form, "src", 200),
    altDe: text(form, "alt_de", 200),
    altEn: text(form, "alt_en", 200),
    ratio: text(form, "ratio"),
    visible: checked(form, "visible"),
  };
  if (!PHOTO.test(f.src) || !RATIOS.includes(f.ratio)) return;
  const sql = db();
  // Landscape photos get a wide frame, portrait and square ones a narrow one.
  const width = f.ratio === "aspect-[16/11]" ? "md:w-[44vw]" : "md:w-[28vw]";
  if (id) {
    await sql`
      update gallery_photos set src = ${f.src}, alt_de = ${f.altDe}, alt_en = ${f.altEn}, ratio = ${f.ratio},
        width = ${width}, visible = ${f.visible}
      where id = ${id}
    `;
    await logActivity(me, "gallery.update", "gallery_photo", id, f.altDe || f.src);
  } else {
    const [{ id: created }] = (await sql`
      insert into gallery_photos (sort, src, alt_de, alt_en, ratio, width)
      values ((select coalesce(max(sort), -1) + 1 from gallery_photos), ${f.src}, ${f.altDe}, ${f.altEn}, ${f.ratio}, ${width})
      returning id
    `) as { id: string }[];
    await logActivity(me, "gallery.create", "gallery_photo", created, f.altDe || f.src);
  }
  refreshContent();
}

export async function deleteGalleryPhoto(form: FormData) {
  const me = await requireOwner();
  const id = text(form, "id");
  const rows = (await db()`delete from gallery_photos where id = ${id} returning alt_de, src`) as {
    alt_de: string;
    src: string;
  }[];
  if (rows[0]) await logActivity(me, "gallery.delete", "gallery_photo", id, rows[0].alt_de || rows[0].src);
  refreshContent();
}

export async function moveGalleryPhoto(form: FormData) {
  const me = await requireOwner();
  await reorder("gallery_photos", text(form, "id"), text(form, "direction"));
  await logActivity(me, "gallery.move", "gallery_photo", text(form, "id"), text(form, "direction"));
  refreshContent();
}
