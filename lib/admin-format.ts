/* Display helpers for the admin portal, which is German like the bar. */

export const STATUS_LABEL: Record<string, string> = {
  pending: "Offen",
  confirmed: "Bestätigt",
  declined: "Abgelehnt",
  cancelled: "Storniert",
};

export const STATUS_STYLE: Record<string, string> = {
  pending: "bg-buoy text-abyss",
  confirmed: "bg-[#4fb39a] text-abyss",
  declined: "bg-foam/15 text-foam",
  cancelled: "bg-foam/15 text-mist line-through",
};

export const OCCASION_LABEL: Record<string, string> = {
  birthday: "Geburtstag",
  company: "Firmenfeier",
  wedding: "Hochzeit",
  other: "Sonstiges",
};

export const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/* `date` is YYYY-MM-DD; formatted without a time zone shift. */
export function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatStamp(value: Date | string) {
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

const ACTIONS: Record<string, string> = {
  "reservation.pending": "Reservierung wieder geöffnet",
  "reservation.confirmed": "Reservierung bestätigt",
  "reservation.declined": "Reservierung abgelehnt",
  "reservation.cancelled": "Reservierung storniert",
  "reservation.note": "Notiz gespeichert",
  "reservation.delete": "Reservierung gelöscht",
  "menu.import": "Karte importiert",
  "menu.category.create": "Kategorie angelegt",
  "menu.category.update": "Kategorie geändert",
  "menu.category.delete": "Kategorie gelöscht",
  "menu.category.move": "Kategorie verschoben",
  "menu.item.create": "Getränk angelegt",
  "menu.item.update": "Getränk geändert",
  "menu.item.delete": "Getränk gelöscht",
  "menu.item.move": "Getränk verschoben",
  "hours.update": "Öffnungszeiten geändert",
  "hours.closed_date.add": "Schließtag eingetragen",
  "hours.closed_date.remove": "Schließtag entfernt",
  "user.signup": "Konto registriert",
  "user.signout": "Abgemeldet",
  "user.profile": "Profil geändert",
  "user.google_link": "Mit Google verknüpft",
  "user.deleted": "Konto vom Gast gelöscht",
  "venue.update": "Bar & Kontakt geändert",
  "night.create": "Abend angelegt",
  "night.update": "Abend geändert",
  "night.delete": "Abend gelöscht",
  "night.move": "Abend verschoben",
  "gallery.create": "Galeriefoto hinzugefügt",
  "gallery.update": "Galeriefoto geändert",
  "gallery.delete": "Galeriefoto entfernt",
  "gallery.move": "Galeriefoto verschoben",
  "retention.cleanup": "Alte Daten automatisch gelöscht",
  "user.create": "Nutzer angelegt",
  "user.role": "Rolle geändert",
  "user.activate": "Nutzer aktiviert",
  "user.deactivate": "Nutzer deaktiviert",
  "user.password": "Passwort zurückgesetzt",
};

export const actionLabel = (action: string) => ACTIONS[action] ?? action;
