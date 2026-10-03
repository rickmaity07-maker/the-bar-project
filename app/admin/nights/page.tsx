import { deleteNight, moveNight, saveNight } from "@/app/admin/content-actions";
import { Empty, Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { PHOTO_LIBRARY } from "@/lib/data";
import { db } from "@/lib/db";

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
  visible: boolean;
}

const EMPTY: NightRow = {
  id: "",
  day_de: "",
  day_en: "",
  title_de: "",
  title_en: "",
  body_de: "",
  body_en: "",
  alt_de: "",
  alt_en: "",
  opens: "18:00",
  closes: "00:00",
  image: PHOTO_LIBRARY[0],
  visible: true,
};

function NightForm({ night }: { night: NightRow }) {
  const isNew = !night.id;
  return (
    <form action={saveNight} className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <input type="hidden" name="id" value={night.id} />
      <input name="day_de" defaultValue={night.day_de} required aria-label="Tag (Deutsch)" placeholder="Tag (Deutsch), z. B. Freitag" className={INPUT} />
      <input name="day_en" defaultValue={night.day_en} aria-label="Tag (Englisch)" placeholder="Tag (Englisch)" className={INPUT} />
      <input name="title_de" defaultValue={night.title_de} required aria-label="Titel (Deutsch)" placeholder="Titel (Deutsch)" className={INPUT} />
      <input name="title_en" defaultValue={night.title_en} aria-label="Titel (Englisch)" placeholder="Titel (Englisch)" className={INPUT} />
      <textarea name="body_de" defaultValue={night.body_de} rows={2} aria-label="Text (Deutsch)" placeholder="Text (Deutsch)" className={`${INPUT} h-auto rounded-3xl py-3`} />
      <textarea name="body_en" defaultValue={night.body_en} rows={2} aria-label="Text (Englisch)" placeholder="Text (Englisch)" className={`${INPUT} h-auto rounded-3xl py-3`} />
      <label className="flex items-center gap-2 text-sm text-mist">
        ab
        <input type="time" name="opens" defaultValue={night.opens} required aria-label="Beginn" className={INPUT} />
        bis
        <input type="time" name="closes" defaultValue={night.closes} required aria-label="Ende" className={INPUT} />
      </label>
      <select name="image" defaultValue={night.image} aria-label="Foto" className={INPUT}>
        {PHOTO_LIBRARY.map((src) => (
          <option key={src} value={src}>
            Foto {src.replace("/photos/", "").slice(0, 13)}
          </option>
        ))}
      </select>
      <input name="alt_de" defaultValue={night.alt_de} aria-label="Bildbeschreibung (Deutsch)" placeholder="Bildbeschreibung (Deutsch)" className={INPUT} />
      <input name="alt_en" defaultValue={night.alt_en} aria-label="Bildbeschreibung (Englisch)" placeholder="Bildbeschreibung (Englisch)" className={INPUT} />
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        {!isNew && (
          <label className="label flex items-center gap-2 text-foam/80">
            <input type="checkbox" name="visible" defaultChecked={night.visible} className="h-4 w-4 accent-buoy" />
            Sichtbar
          </label>
        )}
        <Submit variant={isNew ? "solid" : "ghost"}>{isNew ? "Abend anlegen" : "Speichern"}</Submit>
      </div>
    </form>
  );
}

export default async function NightsPage() {
  await requireOwner();
  const nights = (await db()`
    select id, day_de, day_en, title_de, title_en, body_de, body_en, alt_de, alt_en,
      to_char(opens, 'HH24:MI') as opens, to_char(closes, 'HH24:MI') as closes, image, visible
    from nights order by sort, day_de
  `) as NightRow[];

  return (
    <>
      <PageTitle title="Abende">
        <p className="text-sm text-mist">{nights.length} Karten</p>
      </PageTitle>
      <Notice>
        Die Karten im Bereich „Abende“ auf der Startseite, in dieser Reihenfolge. Fehlt die englische Fassung, zeigt die
        Website die deutsche.
      </Notice>
      <div className="flex flex-col gap-4">
        {nights.length === 0 && <Empty>Noch keine Abende.</Empty>}
        {nights.map((night) => (
          <Panel key={night.id}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="display text-2xl text-foam">
                {night.day_de} · {night.title_de}
                {!night.visible && <span className="label ml-3 align-middle text-mist">Ausgeblendet</span>}
              </h2>
              <div className="flex gap-2">
                <form action={moveNight} className="flex gap-1">
                  <input type="hidden" name="id" value={night.id} />
                  <Submit variant="ghost" name="direction" value="up" className="px-3">↑</Submit>
                  <Submit variant="ghost" name="direction" value="down" className="px-3">↓</Submit>
                </form>
                <form action={deleteNight}>
                  <input type="hidden" name="id" value={night.id} />
                  <Submit variant="danger" confirm={`„${night.title_de}“ löschen?`}>Löschen</Submit>
                </form>
              </div>
            </div>
            <NightForm night={night} />
          </Panel>
        ))}
        <Panel>
          <h2 className="display mb-4 text-2xl text-foam">Neuer Abend</h2>
          <NightForm night={EMPTY} />
        </Panel>
      </div>
    </>
  );
}
