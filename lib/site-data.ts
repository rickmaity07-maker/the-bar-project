import "server-only";
import { db, hasDatabase } from "@/lib/db";
import {
  DEFAULT_SITE_DATA,
  DEFAULT_WEEK,
  FALLBACK_DRINK_IMAGE,
  localPhoto,
  phoneHref,
  type ClosedDate,
  type GalleryPhoto,
  type Night,
  type Venue,
  type DayHours,
  type MenuCategory,
  type SiteData,
} from "@/lib/site";

interface CategoryRow {
  id: string;
  name_de: string;
  name_en: string;
  line_de: string;
  line_en: string;
}

interface ItemRow {
  id: string;
  category_id: string;
  name_de: string;
  name_en: string;
  note_de: string;
  note_en: string;
  price: string;
  image: string;
}

interface HoursRow {
  weekday: number;
  closed: boolean;
  opens: string;
  closes: string;
}

interface VenueRow {
  name: string;
  contact_name: string;
  street: string;
  postal_city: string;
  phone: string;
  maps_url: string;
}

interface NightRow {
  id: string;
  day_de: string;
  day_en: string;
  title_de: string;
  title_en: string;
  body_de: string;
  body_en: string;
  alt_de: string;
  alt_en: string;
  opens: string;
  closes: string;
  image: string;
}

interface PhotoRow {
  id: string;
  src: string;
  alt_de: string;
  alt_en: string;
  ratio: string;
  width: string;
}

/* English falls back to German so a half-translated entry never shows up empty. */
const pair = (de: string, en: string) => ({ de, en: en || de });

/*
  What the public site renders. Anything the database does not hold yet (no
  connection, empty menu, missing weekdays) comes from the built-in defaults,
  so the site never goes blank.
*/
export async function getSiteData(): Promise<SiteData> {
  if (!hasDatabase()) return DEFAULT_SITE_DATA;

  try {
    const sql = db();
    const [categories, items, hours, closed, venues, nightRows, photoRows] = await Promise.all([
      sql`select id, name_de, name_en, line_de, line_en from menu_categories where visible order by sort, name_de`,
      sql`select id, category_id, name_de, name_en, note_de, note_en, price, image from menu_items where visible order by sort, name_de`,
      sql`select weekday, closed, to_char(opens, 'HH24:MI') as opens, to_char(closes, 'HH24:MI') as closes from opening_hours`,
      sql`select date::text as date, reason from closed_dates where date >= current_date - 1 order by date`,
      sql`select name, contact_name, street, postal_city, phone, maps_url from venue where id = 1`,
      sql`select id, day_de, day_en, title_de, title_en, body_de, body_en, alt_de, alt_en,
            to_char(opens, 'HH24:MI') as opens, to_char(closes, 'HH24:MI') as closes, image
          from nights where visible order by sort, day_de`,
      sql`select id, src, alt_de, alt_en, ratio, width from gallery_photos where visible order by sort`,
    ]);

    const v = (venues as VenueRow[])[0];
    const venue: Venue = v
      ? {
          name: v.name,
          contactName: v.contact_name,
          street: v.street,
          postalCity: v.postal_city,
          phone: v.phone,
          phoneHref: phoneHref(v.phone),
          mapsUrl: v.maps_url,
        }
      : DEFAULT_SITE_DATA.venue;

    const nights: Night[] = (nightRows as NightRow[]).map((n) => ({
      id: n.id,
      day: pair(n.day_de, n.day_en),
      title: pair(n.title_de, n.title_en),
      body: pair(n.body_de, n.body_en),
      alt: pair(n.alt_de, n.alt_en),
      opens: n.opens,
      closes: n.closes,
      image: localPhoto(n.image || FALLBACK_DRINK_IMAGE),
    }));

    const gallery: GalleryPhoto[] = (photoRows as PhotoRow[]).map((p) => ({
      id: p.id,
      src: localPhoto(p.src),
      alt: pair(p.alt_de, p.alt_en),
      ratio: p.ratio,
      width: p.width,
    }));

    const menu: MenuCategory[] = (categories as CategoryRow[])
      .map((category) => ({
        id: category.id,
        name: pair(category.name_de, category.name_en),
        line: pair(category.line_de, category.line_en),
        items: (items as ItemRow[])
          .filter((item) => item.category_id === category.id)
          .map((item) => ({
            id: item.id,
            name: pair(item.name_de, item.name_en),
            note: pair(item.note_de, item.note_en),
            price: item.price,
            image: localPhoto(item.image || FALLBACK_DRINK_IMAGE),
          })),
      }))
      .filter((category) => category.items.length > 0);

    const week: DayHours[] = DEFAULT_WEEK.map((fallback, weekday) => {
      const row = (hours as HoursRow[]).find((entry) => entry.weekday === weekday);
      return row ? { closed: row.closed, open: row.opens, close: row.closes } : fallback;
    });

    // A table that is still empty (never seeded) falls back to the built-in content.
    const seeded = async (table: string) =>
      ((await sql.query(`select exists (select 1 from ${table}) as any`)) as { any: boolean }[])[0].any;
    return {
      venue,
      nights: nights.length > 0 || (await seeded("nights")) ? nights : DEFAULT_SITE_DATA.nights,
      gallery: gallery.length > 0 || (await seeded("gallery_photos")) ? gallery : DEFAULT_SITE_DATA.gallery,
      menu: menu.length > 0 ? menu : DEFAULT_SITE_DATA.menu,
      week,
      closedDates: closed as ClosedDate[],
    };
  } catch (error) {
    console.error("Site data could not be loaded, using defaults:", error);
    return DEFAULT_SITE_DATA;
  }
}
