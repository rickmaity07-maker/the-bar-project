import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { VENUE } from "@/lib/data";
import { RETENTION } from "@/lib/retention";

export const metadata: Metadata = {
  title: "Datenschutz | Bar-05",
  description: "Welche Daten die Website von Bar-05 verarbeitet, wofür, wo und wie lange.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="display text-3xl text-foam">{title}</h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-foam/85">{children}</div>
    </section>
  );
}

const ROW = "border-t border-foam/10 py-3 pr-4 align-top";

/*
  Written from what the code actually does (Art. 13 DSGVO). Change it together
  with the code: retention periods come from lib/retention.ts. The operator
  should have it checked before relying on it legally.
*/
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-14 md:py-20">
      <Link href="/" className="display wordmark text-2xl tracking-[0.14em] text-foam">
        BAR-05
      </Link>
      <h1 className="display mt-10 text-[clamp(2.5rem,6vw,4rem)] leading-none text-foam">Datenschutzerklärung</h1>
      <p className="mt-4 text-sm text-mist">Stand: Oktober 2026</p>

      <Section title="1. Verantwortlich">
        <p>
          Bar-05
          <br />
          {VENUE.contact}
          <br />
          Kornmarkt 7, 97421 Schweinfurt
          <br />
          Telefon: <a href={VENUE.phoneHref} className="underline underline-offset-4">{VENUE.phone}</a>
        </p>
        <p>
          Für alle Fragen zum Datenschutz und für Anfragen zu euren Rechten erreicht ihr uns unter dieser Adresse
          und Telefonnummer. Einen Datenschutzbeauftragten müssen wir nicht benennen (§ 38 BDSG).
        </p>
      </Section>

      <Section title="2. Kurz gesagt">
        <ul className="list-disc space-y-2 pl-5">
          <li>Keine Analyse-, Werbe- oder Tracking-Dienste, keine Tracking-Cookies, kein Cookie-Banner nötig.</li>
          <li>Fotos und Schriften liegen auf unserem eigenen Server; beim Besuch lädt euer Browser nichts von Dritten.</li>
          <li>Daten erheben wir nur für Konto und Reservierungen und löschen sie nach festen Fristen automatisch.</li>
          <li>Im Profil könnt ihr eure Daten jederzeit selbst herunterladen und das Konto löschen.</li>
        </ul>
      </Section>

      <Section title="3. Besuch der Website">
        <p>
          Die Website wird von Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, betrieben. Beim Aufruf
          verarbeitet Vercel technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Adresse,
          Browserkennung), um die Seite auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist unser
          berechtigtes Interesse an einem sicheren Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Vercel speichert diese
          Protokolle nur kurzzeitig. Die Seiten und die gesamte Programmlogik laufen in Vercels Rechenzentrum in
          Frankfurt am Main.
        </p>
        <p>
          Mit Vercel besteht ein Auftragsverarbeitungsvertrag (Art. 28 DSGVO) einschließlich der
          EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO), weil Vercel ein US-Unternehmen ist und ein
          Zugriff aus den USA, etwa für den Support, nicht ausgeschlossen werden kann.
        </p>
      </Section>

      <Section title="4. Konto und Anmeldung">
        <p>
          Um zu reservieren, braucht ihr ein Konto. Dafür speichern wir E-Mail-Adresse, Name, auf Wunsch eure
          Telefonnummer und euer Passwort, und zwar nur als nicht umkehrbaren Hash (scrypt). Rechtsgrundlage ist die
          Durchführung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO). Ohne E-Mail und Passwort (oder
          Google-Anmeldung) können wir kein Konto anlegen.
        </p>
        <p>
          Zum Schutz vor dem Erraten von Passwörtern zählen wir fehlgeschlagene Anmeldeversuche je E-Mail-Adresse
          und sperren nach acht Fehlversuchen für 15 Minuten (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p>
          <strong className="text-foam">Anmeldung mit Google:</strong> Wenn ihr „Mit Google anmelden“ wählt, leitet
          euch die Seite zu Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland, weiter. Nach eurer
          Zustimmung bei Google erhalten wir eure E-Mail-Adresse, euren Namen und eine Google-Kennung, euer
          Google-Passwort nie. Ist die E-Mail-Adresse schon bei uns registriert, wird das bestehende Konto verknüpft.
          Für die Verarbeitung bei Google gilt dessen Datenschutzerklärung (policies.google.com/privacy).
        </p>
      </Section>

      <Section title="5. Reservierungen">
        <p>
          Für eine Tischreservierung speichern wir Name, Telefonnummer, Datum, Uhrzeit, Personenzahl, die Sprache der
          Anfrage und die Verbindung zu eurem Konto. Bei einer privaten Veranstaltung kommen Anlass, Ende,
          Kontakt-E-Mail und eure Nachricht hinzu. Diese Angaben brauchen wir, um die Reservierung zu bearbeiten
          (Art. 6 Abs. 1 lit. b DSGVO); ohne sie können wir sie nicht annehmen. Intern können wir eine Notiz zur
          Reservierung hinzufügen.
        </p>
        <p>
          <strong className="text-foam">E-Mails:</strong> Über jede neue Anfrage, Bestätigung, Absage und
          Stornierung verschicken wir E-Mails an euch und an uns. Dafür nutzen wir Gmail von Google Ireland
          Limited; Google kann diese Daten auch in den USA verarbeiten. Grundlage der Übermittlung ist das
          EU-US Data Privacy Framework, nach dem Google zertifiziert ist (Art. 45 DSGVO).
        </p>
      </Section>

      <Section title="6. Wo die Daten liegen">
        <p>
          Konten, Reservierungen, Speisekarte und das Änderungsprotokoll liegen in einer Postgres-Datenbank bei Neon
          (Databricks, Inc., 160 Spear Street, San Francisco, CA 94105, USA) in einem Rechenzentrum von Amazon Web
          Services in Frankfurt am Main. Die Daten verlassen die EU dafür nicht. Mit Neon besteht ein
          Auftragsverarbeitungsvertrag einschließlich der EU-Standardvertragsklauseln für einen möglichen Zugriff
          aus den USA (Art. 28, Art. 46 Abs. 2 lit. c DSGVO). Die Verbindung zur Datenbank ist verschlüsselt.
        </p>
        <p>
          Zugriff auf die Verwaltung haben nur Konten mit der Rolle „Inhaber“. Jede Änderung dort wird mit dem
          handelnden Konto protokolliert.
        </p>
      </Section>

      <Section title="7. Wie lange wir Daten speichern">
        <table className="w-full text-left text-sm">
          <tbody>
            <tr>
              <td className={`${ROW} text-mist`}>Reservierungen</td>
              <td className={ROW}>{RETENTION.reservationMonths} Monate nach dem Reservierungsdatum automatisch gelöscht</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>Änderungsprotokoll der Verwaltung</td>
              <td className={ROW}>{RETENTION.activityMonths} Monate, dann automatisch gelöscht</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>Fehlgeschlagene Anmeldeversuche</td>
              <td className={ROW}>{RETENTION.loginAttemptHours} Stunden</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>Anmeldesitzungen</td>
              <td className={ROW}>bis zur Abmeldung, höchstens fünf Tage</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>Konto</td>
              <td className={ROW}>bis ihr es im Profil löscht oder uns um Löschung bittet</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>E-Mails zu Reservierungen</td>
              <td className={ROW}>im Postfach der Bar höchstens {RETENTION.reservationMonths} Monate nach dem Termin</td>
            </tr>
          </tbody>
        </table>
        <p>Längere Fristen gelten nur, wenn ein Gesetz sie vorschreibt.</p>
      </Section>

      <Section title="8. Cookies und lokaler Speicher">
        <table className="w-full text-left text-sm">
          <tbody>
            <tr>
              <td className={`${ROW} text-mist`}>session</td>
              <td className={ROW}>hält euch nach der Anmeldung angemeldet; höchstens fünf Tage</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>google_oauth</td>
              <td className={ROW}>sichert die Anmeldung mit Google gegen Fälschung ab; zehn Minuten</td>
            </tr>
            <tr>
              <td className={`${ROW} text-mist`}>bar05-locale (lokaler Speicher)</td>
              <td className={ROW}>merkt sich, ob ihr die Seite auf Deutsch oder Englisch lesen wollt</td>
            </tr>
          </tbody>
        </table>
        <p>
          Alle drei sind für die von euch gewünschten Funktionen unbedingt erforderlich und brauchen daher keine
          Einwilligung (§ 25 Abs. 2 Nr. 2 TDDDG). Sie werden nur gesetzt, wenn ihr euch anmeldet oder die Sprache
          wechselt.
        </p>
      </Section>

      <Section title="9. Eure Rechte">
        <p>
          Ihr habt das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17),
          Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen
          Verarbeitungen auf Grundlage unseres berechtigten Interesses (Art. 21).
        </p>
        <p>
          Vieles geht direkt im Profil: Name und Telefon ändern, alle gespeicherten Daten als Datei herunterladen
          und das Konto mit allen Reservierungen löschen. Für alles andere meldet euch über die Kontaktdaten oben.
        </p>
        <p>
          Eine automatisierte Entscheidungsfindung oder Profilbildung findet nicht statt. Ihr könnt euch bei einer
          Aufsichtsbehörde beschweren, für uns zuständig ist das Bayerische Landesamt für Datenschutzaufsicht,
          Promenade 18, 91522 Ansbach.
        </p>
      </Section>

      <div className="mt-14 flex flex-wrap gap-6 text-sm">
        <Link href="/" className="text-mist transition-colors hover:text-foam">
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
