/*
  Language-independent data: photos, prices, times and links.
  Every piece of visible text lives in lib/i18n.ts and is matched to this data by index.
*/
const unsplash = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PHOTOS = {
  pour: unsplash("photo-1470337458703-46ad1756a187"),
  barFloor: unsplash("photo-1711429526427-679eb0b2f156"),
  pendantLamps: unsplash("photo-1572299448190-d7a84f6e6bc9"),
  redChairs: unsplash("photo-1592494804071-faea15d93a8a"),
  emptyRoom: unsplash("photo-1552566626-2d907dab0dff"),
  eatery: unsplash("photo-1570560258879-af7f8e1447ac"),
  terrace: unsplash("photo-1621275471769-e6aa344546d5"),
  drinksTable: unsplash("photo-1702725365144-6e8584ea54e4"),
  chairsTables: unsplash("photo-1582417746333-30354bba843e"),
  fireplace: unsplash("photo-1679419857738-f8a7ca8c5de5"),
  whiskeyOrange: unsplash("photo-1571104508999-893933ded431"),
} as const;

/* Order matches t.nav.links. */
export const NAV_TARGETS = ["#menu", "#nights", "#room", "#visit"] as const;

/* Placeholder contact details. Replace with the real venue before launch. */
export const VENUE = {
  phone: "+49 000 0000000",
  phoneHref: "tel:+490000000000",
  email: "hello@example.com",
  instagram: "https://www.instagram.com/",
  maps: "https://www.google.com/maps",
  /* Order matches t.visit.days. */
  hours: [
    { open: "09:00", close: "01:00" },
    { open: "09:00", close: "05:00" },
  ],
} as const;

const drink = (id: string) => unsplash(`photo-${id}`, 480);

/* Prices in EUR. Categories and items are in the same order as t.menu.categories. */
export const POURS = [
  [
    { price: "7,00", image: drink("1536935338788-846bb9981813") },
    { price: "6,50", image: drink("1560512823-829485b8bf24") },
    { price: "6,00", image: drink("1513558161293-cdaf765ed2fd") },
    { price: "8,00", image: drink("1516997121675-4c2d1684aa3e") },
    { price: "4,00", image: drink("1510812431401-41d2bd2722f3") },
  ],
  [
    { price: "3,50", image: drink("1535958636474-b021ee887b13") },
    { price: "3,50", image: drink("1608270586620-248524c67de9") },
    { price: "3,50", image: drink("1566633806327-68e152aaf26d") },
    { price: "4,00", image: drink("1600788886242-5c96aabe3757") },
    { price: "4,00", image: drink("1518176258769-f227c798150e") },
  ],
  [
    { price: "3,00", image: drink("1586734565008-fbdbc166fd6c") },
    { price: "3,00", image: drink("1527281400683-1aae777175f8") },
    { price: "3,00", image: drink("1569529465841-dfecdab7503b") },
    { price: "3,00", image: drink("1556679343-c7306c1976bc") },
    { price: "2,00", image: drink("1582819509237-d5b75f20ff7a") },
  ],
  [
    { price: "4,00", image: drink("1461023058943-07fcbe16d735") },
    { price: "4,50", image: drink("1517701550927-30cf4ba1dba5") },
    { price: "4,00", image: drink("1495474472287-4d71bcdd2085") },
    { price: "2,50", image: drink("1510591509098-f4fdc6d0ff04") },
    { price: "4,00", image: drink("1541167760496-1628856ab772") },
  ],
] as const;

/* Order matches t.day.beats. */
export const DAY_BEATS = [
  { time: "09:00", image: unsplash("photo-1509042239860-f550ce710b93", 900) },
  { time: "00:00", image: unsplash("photo-1514362545857-3bc16c4c7d1b", 900) },
  { time: "05:00", image: unsplash("photo-1572299448190-d7a84f6e6bc9", 900) },
] as const;

/* Order matches t.nights.items. */
export const NIGHTS = [
  { from: "19:00", until: "22:00", image: PHOTOS.pendantLamps },
  { from: "21:00", until: "01:00", image: PHOTOS.redChairs },
  { from: "21:00", until: "02:00", image: PHOTOS.drinksTable },
  { from: "18:00", until: "21:00", image: PHOTOS.fireplace },
] as const;

/* Order matches t.gallery.alts. */
export const ROOM = [
  { src: PHOTOS.barFloor, ratio: "aspect-[4/5]", width: "md:w-[30vw]" },
  { src: PHOTOS.pour, ratio: "aspect-[16/11]", width: "md:w-[46vw]" },
  { src: PHOTOS.chairsTables, ratio: "aspect-square", width: "md:w-[28vw]" },
  { src: PHOTOS.emptyRoom, ratio: "aspect-[16/11]", width: "md:w-[44vw]" },
  { src: PHOTOS.whiskeyOrange, ratio: "aspect-[4/5]", width: "md:w-[26vw]" },
  { src: PHOTOS.eatery, ratio: "aspect-[16/11]", width: "md:w-[42vw]" },
] as const;

/* Mean depth of the Atlantic Ocean in metres. */
export const MAX_DEPTH = 3646;
