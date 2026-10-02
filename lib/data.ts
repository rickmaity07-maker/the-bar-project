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

export const VENUE = {
  contact: "Eray Cadiroglu",
  phone: "0176 70220501",
  phoneHref: "tel:+4917670220501",
  maps: "https://www.google.com/maps/search/?api=1&query=Kornmarkt+7%2C+97421+Schweinfurt",
} as const;

const drink = (id: string) => unsplash(`photo-${id}`, 480);

const COCKTAIL = [
  drink("1536935338788-846bb9981813"),
  drink("1560512823-829485b8bf24"),
  drink("1513558161293-cdaf765ed2fd"),
];
const WINE = [drink("1516997121675-4c2d1684aa3e"), drink("1510812431401-41d2bd2722f3")];
const BEER = [
  drink("1535958636474-b021ee887b13"),
  drink("1608270586620-248524c67de9"),
  drink("1566633806327-68e152aaf26d"),
  drink("1600788886242-5c96aabe3757"),
  drink("1518176258769-f227c798150e"),
];
const SPIRIT = [
  drink("1586734565008-fbdbc166fd6c"),
  drink("1527281400683-1aae777175f8"),
  drink("1569529465841-dfecdab7503b"),
  drink("1556679343-c7306c1976bc"),
  drink("1582819509237-d5b75f20ff7a"),
];

/* Pairs each price with a photo, cycling through the pool. */
const priced = (pool: string[], prices: string[]) =>
  prices.map((price, index) => ({ price, image: pool[index % pool.length] }));

const each = (count: number, price: string) => Array<string>(count).fill(price);

/*
  Prices in EUR. Categories and items are in the same order as t.menu.categories.
  Two prices mean two sizes; the sizes are named in the item's note.
*/
export const POURS = [
  /* Kukki bottled cocktails */
  priced(COCKTAIL, each(9, "6,50")),
  /* Gespritzte */
  priced([...SPIRIT, ...COCKTAIL], each(10, "3,50")),
  /* Shots */
  priced(SPIRIT, each(8, "2,50")),
  /* Beer */
  priced(BEER, ["3,20 / 3,80", "3,80", "3,80", "4,00", "3,80", "4,00", "4,00"]),
  /* Wine spritzers and aperitifs */
  priced([...WINE, COCKTAIL[1], COCKTAIL[0]], ["4,00 / 5,50", "4,00 / 5,50", "6,50", "6,50"]),
  /* Soft drinks */
  priced(COCKTAIL, [
    "3,00 / 4,00",
    "3,00 / 4,00",
    "3,00 / 4,00",
    "3,00 / 4,00",
    "3,00",
    "4,00",
    "3,00 / 4,00",
    "3,50",
  ]),
  /* Bottle packages */
  priced(SPIRIT, each(9, "75,00")),
];

/* Order matches t.day.beats. */
export const DAY_BEATS = [
  { time: "18:00", image: unsplash("photo-1470337458703-46ad1756a187", 900) },
  { time: "00:00", image: unsplash("photo-1514362545857-3bc16c4c7d1b", 900) },
  { time: "03:00", image: unsplash("photo-1572299448190-d7a84f6e6bc9", 900) },
] as const;

/* Order matches t.nights.items. */
export const NIGHTS = [
  { from: "18:00", until: "00:00", image: PHOTOS.pendantLamps },
  { from: "18:00", until: "03:00", image: PHOTOS.redChairs },
  { from: "18:00", until: "03:00", image: PHOTOS.drinksTable },
  { from: "18:00", until: "00:00", image: PHOTOS.fireplace },
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
