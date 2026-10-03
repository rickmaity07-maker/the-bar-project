/*
  Fills the content tables with what the site shows by default: the bar's
  details, the nights programme, the gallery, the menu and the opening hours.
  Only empty tables (or missing weekdays) are filled, so it is safe to run
  again and never overwrites changes made in the admin portal.

    npm run db:seed
*/
import { neon } from "@neondatabase/serverless";
import { DEFAULT_SITE_DATA, DEFAULT_WEEK, defaultMenu } from "@/lib/site";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Add it to .env.local first.");
  process.exit(1);
}
const sql = neon(url);
const isEmpty = async (table: string) =>
  !((await sql.query(`select exists (select 1 from ${table}) as any`)) as { any: boolean }[])[0].any;

const v = DEFAULT_SITE_DATA.venue;
const venue = await sql`
  insert into venue (id, name, contact_name, street, postal_city, phone, maps_url)
  values (1, ${v.name}, ${v.contactName}, ${v.street}, ${v.postalCity}, ${v.phone}, ${v.mapsUrl})
  on conflict (id) do nothing
  returning id
`;
console.log(venue.length ? "venue: filled" : "venue: already set, left unchanged");

if (await isEmpty("nights")) {
  await sql.transaction(
    DEFAULT_SITE_DATA.nights.map(
      (n, i) => sql`
        insert into nights (sort, day_de, day_en, title_de, title_en, body_de, body_en, alt_de, alt_en, opens, closes, image)
        values (${i}, ${n.day.de}, ${n.day.en}, ${n.title.de}, ${n.title.en}, ${n.body.de}, ${n.body.en},
                ${n.alt.de}, ${n.alt.en}, ${n.opens}, ${n.closes}, ${n.image})
      `,
    ),
  );
  console.log(`nights: filled with ${DEFAULT_SITE_DATA.nights.length}`);
} else console.log("nights: already filled, left unchanged");

if (await isEmpty("gallery_photos")) {
  await sql.transaction(
    DEFAULT_SITE_DATA.gallery.map(
      (p, i) => sql`
        insert into gallery_photos (sort, src, alt_de, alt_en, ratio, width)
        values (${i}, ${p.src}, ${p.alt.de}, ${p.alt.en}, ${p.ratio}, ${p.width})
      `,
    ),
  );
  console.log(`gallery_photos: filled with ${DEFAULT_SITE_DATA.gallery.length}`);
} else console.log("gallery_photos: already filled, left unchanged");

if (await isEmpty("menu_categories")) {
  for (const [c, category] of defaultMenu().entries()) {
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
  console.log("menu: filled");
} else console.log("menu: already filled, left unchanged");

const hours = await sql.transaction(
  DEFAULT_WEEK.map(
    (d, weekday) => sql`
      insert into opening_hours (weekday, closed, opens, closes) values (${weekday}, ${d.closed}, ${d.open}, ${d.close})
      on conflict (weekday) do nothing returning weekday
    `,
  ),
);
const added = hours.filter((rows) => (rows as unknown[]).length > 0).length;
console.log(added ? `opening_hours: added ${added} missing weekdays` : "opening_hours: all 7 days set, left unchanged");
