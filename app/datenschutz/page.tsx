import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { VENUE } from "@/lib/data";

export const metadata: Metadata = {
  title: "Datenschutz | Bar-05",
  description: "Welche Daten die Website von Bar-05 verarbeitet, wofür und bei welchen Anbietern.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="display text-3xl text-foam">{title}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-foam/85">{children}</div>
    </section>
  );
}

/*
  Describes what this site actually does with personal data. The operator
  should have it checked before relying on it legally.
*/
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-14 md:py-20">
      <Link href="/" className="display wordmark text-2xl tracking-[0.14em] text-foam">
        BAR-05
      </Link>
      <h1 className="display mt-10 text-[clamp(2.5rem,6vw,4rem)] leading-none text-foam">Datenschutzerklärung</h1>
      <p className="mt-4 text-sm text-mist">Stand: Oktober 2026</p>

      <Section title="Verantwortlich">
        <p>
          Bar-05
          <br />
          {VENUE.contact}
          <br />
          Kornmarkt 7, 97421 Schweinfurt
          <br />
          Telefon: <a href={VENUE.phoneHref} className="underline underline-offset-4">{VENUE.phone}</a>
        </p>
        <p>Fragen zum Datenschutz und Anfragen zu euren Rechten richtet ihr bitte an diese Adresse oder Telefonnummer.</p>
      </Section>

      <Section title="Besuch der Website">
        <p>
          Die Website wird bei Vercel Inc. (USA) betrieben. Beim Aufruf verarbeitet Vercel technisch notwendige
          Daten wie IP-Adresse, Zeitpunkt und aufgerufene Seite, um die Seite auszuliefern und vor Missbrauch zu
          schützen (Art. 6 Abs. 1 lit. f DSGVO). Die Übermittlung in die USA stützt sich auf das EU-US Data Privacy
          Framework und die Standardvertragsklauseln von Vercel.
        </p>
        <p>
          Fotos werden von Unsplash geladen; dabei erhält Unsplash eure IP-Adresse. Wir setzen keine Analyse- oder
          Werbe-Tracker ein.
        </p>
      </Section>

      <Section title="Konto und Anmeldung">
        <p>
          Für Reservierungen braucht ihr ein Konto. Wir speichern dafür E-Mail-Adresse, Name, Telefonnummer und ein
          verschlüsseltes Passwort (Art. 6 Abs. 1 lit. b DSGVO). Fehlgeschlagene Anmeldeversuche werden 15 Minuten
          lang gezählt, um Konten vor dem Erraten von Passwörtern zu schützen.
        </p>
        <p>
          Meldet ihr euch mit Google an, erhalten wir von Google eure E-Mail-Adresse, euren Namen und eine
          Google-Kennung. Euer Google-Passwort sehen wir nie. Dabei gelten zusätzlich die Datenschutzbestimmungen
          von Google.
        </p>
      </Section>

      <Section title="Reservierungen">
        <p>
          Bei einer Reservierung speichern wir Name, Telefonnummer, Datum, Uhrzeit und Personenzahl, bei privaten
          Veranstaltungen zusätzlich Anlass, Ende, E-Mail-Adresse und eure Nachricht (Art. 6 Abs. 1 lit. b DSGVO).
          Über jede neue Anfrage und jede Stornierung werden wir per E-Mail über Google Gmail benachrichtigt.
        </p>
      </Section>

      <Section title="Wo die Daten liegen">
        <p>
          Konten und Reservierungen liegen in einer Datenbank bei Neon (Databricks, Inc.), betrieben in einem
          Rechenzentrum von Amazon Web Services. Wir löschen Konten und Reservierungen auf Anfrage, sofern keine
          gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
      </Section>

      <Section title="Cookies und lokaler Speicher">
        <p>
          Nach der Anmeldung setzen wir ein Sitzungs-Cookie, das euch fünf Tage lang angemeldet hält. Während der
          Anmeldung mit Google setzen wir für zehn Minuten ein weiteres Cookie, das die Anmeldung absichert. Eure
          Sprachwahl (Deutsch oder Englisch) speichert euer Browser lokal. Alle sind für die Funktion der Seite
          nötig (§ 25 Abs. 2 TDDDG); Tracking-Cookies verwenden wir nicht.
        </p>
      </Section>

      <Section title="Eure Rechte">
        <p>
          Ihr habt das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch (Art. 15 bis 21 DSGVO). Name und Telefonnummer könnt ihr jederzeit
          selbst im Profil ändern. Außerdem könnt ihr euch bei einer Datenschutz-Aufsichtsbehörde beschweren, in
          Bayern beim Bayerischen Landesamt für Datenschutzaufsicht.
        </p>
      </Section>

      <Link href="/" className="mt-14 inline-block text-sm text-mist transition-colors hover:text-foam">
        Zur Startseite
      </Link>
    </main>
  );
}
