import "server-only";
import { db, hasDatabase } from "@/lib/db";
import {
  DEFAULT_SITE_DATA,
  DEFAULT_WEEK,
  FALLBACK_DRINK_IMAGE,
  localPhoto,
  type ClosedDate,
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
    const [categories, items, hours, closed] = await Promise.all([
      sql`select id, name_de, name_en, line_de, line_en from menu_categories where visible order by sort, name_de`,
      sql`select id, category_id, name_de, name_en, note_de, note_en, price, image from menu_items where visible order by sort, name_de`,
      sql`select weekday, closed, to_char(opens, 'HH24:MI') as opens, to_char(closes, 'HH24:MI') as closes from opening_hours`,
      sql`select date::text as date, reason from closed_dates where date >= current_date - 1 order by date`,
    ]);

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

    return {
      menu: menu.length > 0 ? menu : DEFAULT_SITE_DATA.menu,
      week,
      closedDates: closed as ClosedDate[],
    };
  } catch (error) {
    console.error("Site data could not be loaded, using defaults:", error);
    return DEFAULT_SITE_DATA;
  }
}
