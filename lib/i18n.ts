/*
  All visible copy, in German (primary) and English.
  Headings are stored as [before, emphasised, after]; the middle part is set in
  the accent italic. Lists are matched by index to the data in lib/data.ts.
*/
export type Locale = "de" | "en";

export const LOCALES: Locale[] = ["de", "en"];
export const DEFAULT_LOCALE: Locale = "de";

const de = {
  nav: {
    links: ["Karte", "Nächte", "Galerie", "Besuch"],
    reserve: "Tisch reservieren",
    logoSub: "Bar und Café",
    home: "Fathom, zum Seitenanfang",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    menuLabel: "Menü",
    language: "Sprache",
    mainLabel: "Hauptnavigation",
  },
  hero: {
    h1: "Fathom, die Bar am Grund des Ozeans",
    sub: "Die Bar am Grund des Atlantiks. Tagsüber Café, nachts Cocktailbar.",
    seeMenu: "Zur Karte",
  },
  day: {
    beats: [
      {
        label: "Morgens",
        text: "Wir öffnen, solange das Licht noch durch die Fenster fällt. Griechischer Mokka und Freddo Espresso tragen den Morgen.",
        alt: "Tassen mit Milchkaffee auf einem Holztisch",
      },
      {
        label: "Mitternacht",
        text: "Jetzt gehört der Raum den Hauscocktails, dem kalten Ouzo und allen, die gerade auflegen.",
        alt: "Ein Cocktail mit Kräutergarnitur auf einem Holzbrett",
      },
      {
        label: "Letzte Runde",
        text: "Am Wochenende bleiben wir bis fünf Uhr unter Wasser.",
        alt: "Eine lange Bar unter Reihen von Pendelleuchten",
      },
    ],
  },
  menu: {
    title: ["Alles, was wir ", "ausschenken,", " auf einer Karte."],
    sections: "Bereiche der Karte",
    priceNote: "Preise in Euro.",
    categories: [
      {
        name: "Cocktails",
        line: "Frisch geschüttelt und so bepreist, dass ein zweiter drin ist.",
        items: [
          { name: "Hauscocktails", note: "Alle auf der Karte" },
          { name: "Aperol Spritz", note: "Mit Prosecco" },
          { name: "Longdrinks", note: "Jede Spirituose, jeder Filler" },
          { name: "Retsina Malamatina", note: "0,5 l" },
          { name: "Rosé", note: "0,25 l" },
        ],
      },
      {
        name: "Bier",
        line: "Kalte Flaschen und ein ehrlicher halber Liter.",
        items: [
          { name: "Beck's Pils", note: "0,5 l" },
          { name: "Rothbier Hefe", note: "0,5 l" },
          { name: "Radler", note: "0,5 l" },
          { name: "Corona", note: "0,35 l" },
          { name: "Salitos", note: "0,33 l" },
        ],
      },
      {
        name: "Spirituosen",
        line: "Drei Euro das Glas, quer durch das ganze Regal.",
        items: [
          { name: "Ouzo", note: "Kalt serviert" },
          { name: "Jack Daniel's", note: "Tennessee Whiskey" },
          { name: "Johnnie Walker", note: "Scotch" },
          { name: "Havana", note: "Rum" },
          { name: "Kurze", note: "Alle" },
        ],
      },
      {
        name: "Kaffee",
        line: "Auf griechische Art, ab neun Uhr morgens.",
        items: [
          { name: "Freddo Espresso", note: "Eiskalt, geschüttelt" },
          { name: "Freddo Cappuccino", note: "Eiskalt, mit kaltem Schaum" },
          { name: "Frappé", note: "Der Klassiker" },
          { name: "Griechischer Mokka", note: "Klein" },
          { name: "Latte Macchiato", note: "Im hohen Glas" },
        ],
      },
    ],
  },
  visit: {
    title: ["Sechzehn Stunden am Tag, am Wochenende ", "länger.", ""],
    roomTitle: ["Ein Raum, ", "zwei Gezeiten.", ""],
    roomBody:
      "Laptops und Kaffee bis zum Nachmittag. Nach Einbruch der Dunkelheit stehen auf denselben Tischen Cocktails und die Musik wird lauter.",
    roomAlt: "Ein warmer Barraum mit Holzboden und Hockern entlang der Theke",
    hoursTitle: "Öffnungszeiten",
    days: ["Sonntag bis Donnerstag", "Freitag und Samstag"],
    until: "bis",
    street: "Straßenname 00",
    city: "00000 Deine Stadt",
    mapsNote: "In Maps öffnen.",
    terraceAlt: "Eine beleuchtete Terrassenlounge bei Nacht",
    greekTitle: "Im Herzen griechisch, wohin der Name auch zeigt.",
    greekBody:
      "Mokka, langsam im Briki gebrüht, Retsina im halben Liter und kalt eingeschenkter Ouzo. Der Ozean gibt den Namen. Der Küchentisch steht in Griechenland.",
  },
  marquee: ["Freddo Espresso", "Hauscocktails", "Ouzo", "Deep House", "Retsina", "Griechischer Mokka"],
  nights: {
    title: ["Vier Nächte, für die es sich lohnt, ", "unten zu bleiben.", ""],
    until: "bis",
    items: [
      {
        day: "Donnerstag",
        title: "Golden Hour Jazz",
        body: "Ein Trio in der Ecke und die ersten Cocktails der Woche.",
        alt: "Eine lange Bar unter Reihen von Pendelleuchten",
      },
      {
        day: "Freitag",
        title: "Live-DJ, Deep House",
        body: "Die Tische rücken ein Stück zurück. Die Bar bleibt bis fünf geöffnet.",
        alt: "Eine Rückwand voller Flaschen und Hängepflanzen",
      },
      {
        day: "Samstag",
        title: "Premium Nights",
        body: "Unsere lauteste Nacht. Reserviert einen Tisch oder kommt früh.",
        alt: "Ein hoher Cocktail auf Eis mit einer Zitronenscheibe",
      },
      {
        day: "Sonntag",
        title: "Akustik-Sessions",
        body: "Eine Gitarre, wenig Licht und ein langsames Ende des Wochenendes.",
        alt: "Ledersessel um einen kleinen Tisch in einer gedimmten Lounge",
      },
    ],
  },
  gallery: {
    title: ["Der Raum, vor und ", "nach Einbruch der Nacht.", ""],
    body: "Barhocker, tief hängende Lampen und ein Raum, der sich am Wochenende schnell füllt.",
    alts: [
      "Ein Barraum mit Holzboden und Hockern entlang der Theke",
      "Ein Drink wird über einen großen Eiswürfel gegossen",
      "Tische und Stühle, für den Abend gedeckt",
      "Eine Bar mit Kupferfront, davor Ledersofas",
      "Ein Whiskeyglas im Schein eines Feuers",
      "Ein dunkler Speiseraum mit hohen Fenstern",
    ],
  },
  reserve: {
    title: ["Ein Tisch ganz ", "unten.", ""],
    body: "Sagt uns, wann ihr kommt und wie viele ihr seid. Für Tische am selben Tag geht ein Anruf schneller.",
    name: "Name",
    phone: "Telefon",
    date: "Datum",
    time: "Ankunftszeit",
    guests: "Gäste",
    namePlaceholder: "Eleni Brandt",
    guestCount: (count: number) => (count === 1 ? "1 Gast" : `${count} Gäste`),
    submit: "Tisch anfragen",
    sending: "Anfrage wird gesendet",
    failed: "Das hat leider nicht geklappt. Bitte versucht es noch einmal oder ruft uns an:",
    sentTitle: "Anfrage erhalten.",
    sentBody: (name: string, phone: string, guests: string, time: string) =>
      `Danke, ${name}. Wir rufen unter ${phone} an und bestätigen euren Tisch für ${guests} um ${time} Uhr.`,
    again: "Weiteren Tisch anfragen",
    errors: {
      name: "Bitte gebt den Namen für die Reservierung an.",
      phone: "Bitte gebt eine Telefonnummer an, unter der wir euch erreichen.",
      date: "Bitte wählt ein Datum.",
      datePast: "Dieses Datum liegt in der Vergangenheit.",
      time: "Bitte wählt eine Ankunftszeit.",
      guests: "Wir nehmen Reservierungen für 1 bis 12 Gäste an.",
    },
  },
  footer: {
    findUs: "Adresse",
    hours: "Öffnungszeiten",
    contact: "Kontakt",
    onThisPage: "Auf dieser Seite",
    navLabel: "Fußzeile",
    credit: "Fathom Bar. Konzeptseite, zu Demonstrationszwecken erstellt.",
  },
  gauge: { zones: ["Lichtzone", "Dämmerzone", "Mitternachtszone"] },
};

export type Dict = typeof de;

const en: Dict = {
  nav: {
    links: ["Menu", "Nights", "Gallery", "Visit"],
    reserve: "Reserve a table",
    logoSub: "Bar and café",
    home: "Fathom, back to top",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menuLabel: "Menu",
    language: "Language",
    mainLabel: "Main",
  },
  hero: {
    h1: "Fathom, the bar at the bottom of the ocean",
    sub: "The bar at the bottom of the Atlantic. A café by day and a cocktail bar by night.",
    seeMenu: "See the menu",
  },
  day: {
    beats: [
      {
        label: "Morning",
        text: "We open while the light still reaches the windows. Greek moka and freddo espresso carry the morning.",
        alt: "Cups of milky coffee on a wooden table",
      },
      {
        label: "Midnight",
        text: "By now the room belongs to house cocktails, cold ouzo and whoever is on the decks.",
        alt: "A cocktail with a herb garnish on a wooden board",
      },
      {
        label: "Last call",
        text: "On weekends we stay under until five.",
        alt: "A long bar under rows of pendant lamps",
      },
    ],
  },
  menu: {
    title: ["Everything we ", "pour,", " on one card."],
    sections: "Menu sections",
    priceNote: "Prices in euros.",
    categories: [
      {
        name: "Cocktails",
        line: "Shaken to order, priced so you can have a second.",
        items: [
          { name: "House cocktails", note: "Every one on the list" },
          { name: "Aperol Spritz", note: "With Prosecco" },
          { name: "Longdrinks", note: "Any spirit, any mixer" },
          { name: "Retsina Malamatina", note: "0,5 l" },
          { name: "Rosé", note: "0,25 l" },
        ],
      },
      {
        name: "Beer",
        line: "Cold bottles and a proper half litre.",
        items: [
          { name: "Beck's Pils", note: "0,5 l" },
          { name: "Rothbier Hefe", note: "0,5 l" },
          { name: "Radler", note: "0,5 l" },
          { name: "Corona", note: "0,35 l" },
          { name: "Salitos", note: "0,33 l" },
        ],
      },
      {
        name: "Spirits",
        line: "Three euros a glass, across the whole back bar.",
        items: [
          { name: "Ouzo", note: "Served cold" },
          { name: "Jack Daniel's", note: "Tennessee whiskey" },
          { name: "Johnnie Walker", note: "Scotch" },
          { name: "Havana", note: "Rum" },
          { name: "Shots", note: "All of them" },
        ],
      },
      {
        name: "Coffee",
        line: "The Greek way, from nine in the morning.",
        items: [
          { name: "Freddo Espresso", note: "Iced, shaken" },
          { name: "Freddo Cappuccino", note: "Iced, cold foam" },
          { name: "Frappé", note: "The classic" },
          { name: "Greek Moka", note: "Small" },
          { name: "Latte Macchiato", note: "Tall glass" },
        ],
      },
    ],
  },
  visit: {
    title: ["Sixteen hours a day, ", "longer", " on weekends."],
    roomTitle: ["One room, ", "two tides.", ""],
    roomBody:
      "Laptops and coffee until the afternoon. After dark the same tables hold cocktails and the music comes up.",
    roomAlt: "A warm wood-floored bar room with stools along the counter",
    hoursTitle: "Opening hours",
    days: ["Sunday to Thursday", "Friday and Saturday"],
    until: "to",
    street: "Street name 00",
    city: "00000 Your city",
    mapsNote: "Open in Maps.",
    terraceAlt: "A terrace lounge lit up at night",
    greekTitle: "Greek at heart, wherever the name points.",
    greekBody:
      "Moka brewed slowly in the briki, Retsina by the half litre and ouzo poured cold. The ocean is the name. The kitchen table is in Greece.",
  },
  marquee: ["Freddo espresso", "House cocktails", "Ouzo", "Deep house", "Retsina", "Greek moka"],
  nights: {
    title: ["Four nights worth ", "staying under", " for."],
    until: "to",
    items: [
      {
        day: "Thursday",
        title: "Golden Hour Jazz",
        body: "A trio in the corner and the first cocktails of the week.",
        alt: "A long bar under rows of pendant lamps",
      },
      {
        day: "Friday",
        title: "Live DJ, Deep House",
        body: "The tables move back a little. The bar stays open until five.",
        alt: "A back bar filled with bottles and hanging plants",
      },
      {
        day: "Saturday",
        title: "Premium Nights",
        body: "The loudest night we do. Book a table or arrive early.",
        alt: "A tall iced cocktail with a slice of lemon",
      },
      {
        day: "Sunday",
        title: "Acoustic Sessions",
        body: "One guitar, low lights and a slow end to the weekend.",
        alt: "Leather armchairs around a small table in a dim lounge",
      },
    ],
  },
  gallery: {
    title: ["The room, before and ", "after dark.", ""],
    body: "Bar stools, low lamps and a floor that fills up fast on weekends.",
    alts: [
      "A wood-floored bar room with stools along the counter",
      "A drink being poured over a large ice cube",
      "Tables and chairs set for the evening",
      "A copper-fronted bar with leather sofas in front",
      "A whiskey glass catching firelight",
      "A dark dining room with tall windows",
    ],
  },
  reserve: {
    title: ["Hold a table at the ", "bottom.", ""],
    body: "Tell us when you are coming and how many you are. For same-day tables, calling is quicker.",
    name: "Name",
    phone: "Phone",
    date: "Date",
    time: "Arrival time",
    guests: "Guests",
    namePlaceholder: "Eleni Brandt",
    guestCount: (count: number) => (count === 1 ? "1 guest" : `${count} guests`),
    submit: "Request this table",
    sending: "Sending request",
    failed: "We could not send that. Please try again or call us on",
    sentTitle: "Request received.",
    sentBody: (name: string, phone: string, guests: string, time: string) =>
      `Thanks, ${name}. We will call ${phone} to confirm your table for ${guests} at ${time}.`,
    again: "Book another table",
    errors: {
      name: "Please enter the name for the booking.",
      phone: "Please enter a phone number we can reach you on.",
      date: "Please choose a date.",
      datePast: "That date has already passed.",
      time: "Please choose an arrival time.",
      guests: "We take bookings for 1 to 12 guests.",
    },
  },
  footer: {
    findUs: "Find us",
    hours: "Hours",
    contact: "Contact",
    onThisPage: "On this page",
    navLabel: "Footer",
    credit: "Fathom Bar. Concept site, built for demonstration.",
  },
  gauge: { zones: ["Sunlight zone", "Twilight zone", "Midnight zone"] },
};

export const content: Record<Locale, Dict> = { de, en };
