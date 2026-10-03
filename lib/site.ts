/*
  The parts of the site that live in the database and are edited in the admin
  portal: the bar's details, the menu, opening hours, the nights programme and
  the gallery. The defaults below seed the database (npm run db:seed) and are
  shown only if it is unreachable or a table is still empty.
*/
import { NIGHTS, POURS, ROOM, VENUE } from "@/lib/data";
import { content } from "@/lib/i18n";

export interface Bilingual {
  de: string;
  en: string;
}

export interface MenuItem {
  id: string;
  name: Bilingual;
  note: Bilingual;
  price: string;
  image: string;
}

export interface MenuCategory {
  id: string;
  name: Bilingual;
  line: Bilingual;
  items: MenuItem[];
}

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export interface ClosedDate {
  date: string;
  reason: string;
}

export interface Venue {
  name: string;
  contactName: string;
  street: string;
  postalCity: string;
  phone: string;
  /* tel: link built from the phone number, German numbers in international form. */
  phoneHref: string;
  mapsUrl: string;
}

export interface Night {
  id: string;
  day: Bilingual;
  title: Bilingual;
  body: Bilingual;
  alt: Bilingual;
  opens: string;
  closes: string;
  image: string;
}

export interface GalleryPhoto {
  id: string;
  src: string;
  alt: Bilingual;
  ratio: string;
  width: string;
}

export interface SiteData {
  venue: Venue;
  nights: Night[];
  gallery: GalleryPhoto[];
  menu: MenuCategory[];
  /* Indexed like Date.getDay(): 0 is Sunday, 6 is Saturday. */
  week: DayHours[];
  closedDates: ClosedDate[];
}

const CLOSED: DayHours = { closed: true, open: "18:00", close: "00:00" };
const UNTIL_MIDNIGHT: DayHours = { closed: false, open: "18:00", close: "00:00" };
const UNTIL_THREE: DayHours = { closed: false, open: "18:00", close: "03:00" };

export const DEFAULT_WEEK: DayHours[] = [
  UNTIL_MIDNIGHT,
  CLOSED,
  CLOSED,
  UNTIL_MIDNIGHT,
  UNTIL_MIDNIGHT,
  UNTIL_THREE,
  UNTIL_THREE,
];

/* Older menu rows stored Unsplash addresses; they point at the same photo hosted here. */
export function localPhoto(url: string) {
  const id = url.match(/photo-(\d+-[0-9a-f]+)/)?.[1];
  return url.startsWith("https://images.unsplash.com/") && id ? `/photos/${id}.jpg` : url;
}

/* Shown for drinks added in the portal, which have no photo of their own. */
export const FALLBACK_DRINK_IMAGE = POURS[0][0].image;

export function defaultMenu(): MenuCategory[] {
  return content.de.menu.categories.map((category, c) => ({
    id: `default-${c}`,
    name: { de: category.name, en: content.en.menu.categories[c].name },
    line: { de: category.line, en: content.en.menu.categories[c].line },
    items: category.items.map((item, i) => ({
      id: `default-${c}-${i}`,
      name: { de: item.name, en: content.en.menu.categories[c].items[i].name },
      note: { de: item.note, en: content.en.menu.categories[c].items[i].note },
      price: POURS[c][i].price,
      image: POURS[c][i].image,
    })),
  }));
}

/* 0176 70220501 -> tel:+4917670220501 */
export function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("0") && !digits.startsWith("00") ? `+49${digits.slice(1)}` : digits}`;
}

export const DEFAULT_VENUE: Venue = {
  name: "Bar-05",
  contactName: VENUE.contact,
  street: content.de.visit.street,
  postalCity: content.de.visit.city,
  phone: VENUE.phone,
  phoneHref: VENUE.phoneHref,
  mapsUrl: VENUE.maps,
};

export function defaultNights(): Night[] {
  return NIGHTS.map((night, i) => {
    const de = content.de.nights.items[i];
    const en = content.en.nights.items[i];
    return {
      id: `default-night-${i}`,
      day: { de: de.day, en: en.day },
      title: { de: de.title, en: en.title },
      body: { de: de.body, en: en.body },
      alt: { de: de.alt, en: en.alt },
      opens: night.from,
      closes: night.until,
      image: night.image,
    };
  });
}

export function defaultGallery(): GalleryPhoto[] {
  return ROOM.map((photo, i) => ({
    id: `default-photo-${i}`,
    src: photo.src,
    alt: { de: content.de.gallery.alts[i], en: content.en.gallery.alts[i] },
    ratio: photo.ratio,
    width: photo.width,
  }));
}

export const DEFAULT_SITE_DATA: SiteData = {
  venue: DEFAULT_VENUE,
  nights: defaultNights(),
  gallery: defaultGallery(),
  menu: defaultMenu(),
  week: DEFAULT_WEEK,
  closedDates: [],
};

export interface HoursGroup extends DayHours {
  days: number[];
}

/* Days with identical hours share a row, listed Monday first. */
export function groupHours(week: DayHours[]): HoursGroup[] {
  const groups: HoursGroup[] = [];
  for (const day of [1, 2, 3, 4, 5, 6, 0]) {
    const hours = week[day];
    const match = groups.find(
      (group) =>
        group.closed === hours.closed &&
        (hours.closed || (group.open === hours.open && group.close === hours.close)),
    );
    if (match) match.days.push(day);
    else groups.push({ ...hours, days: [day] });
  }
  return groups;
}

/* `date` is YYYY-MM-DD. True on a closed weekday or a one-off closed date. */
export function isClosedOn(date: string, week: DayHours[], closedDates: ClosedDate[]) {
  if (closedDates.some((entry) => entry.date === date)) return true;
  return week[new Date(`${date}T00:00:00`).getDay()].closed;
}
