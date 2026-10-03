import Image from "next/image";
import { deleteGalleryPhoto, moveGalleryPhoto, saveGalleryPhoto } from "@/app/admin/content-actions";
import { Empty, Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { PHOTO_LIBRARY } from "@/lib/data";
import { db } from "@/lib/db";

interface PhotoRow {
  id: string;
  src: string;
  alt_de: string;
  alt_en: string;
  ratio: string;
  visible: boolean;
}

const RATIOS: [string, string][] = [
  ["aspect-[4/5]", "Hochformat"],
  ["aspect-[16/11]", "Querformat"],
  ["aspect-square", "Quadrat"],
];

function PhotoFields({ photo }: { photo?: PhotoRow }) {
  return (
    <>
      <select name="src" defaultValue={photo?.src ?? PHOTO_LIBRARY[0]} aria-label="Foto" className={INPUT}>
        {PHOTO_LIBRARY.map((src) => (
          <option key={src} value={src}>
            Foto {src.replace("/photos/", "").slice(0, 13)}
          </option>
        ))}
      </select>
      <select name="ratio" defaultValue={photo?.ratio ?? "aspect-[4/5]"} aria-label="Format" className={INPUT}>
        {RATIOS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input name="alt_de" defaultValue={photo?.alt_de} aria-label="Bildbeschreibung (Deutsch)" placeholder="Bildbeschreibung (Deutsch)" className={INPUT} />
      <input name="alt_en" defaultValue={photo?.alt_en} aria-label="Bildbeschreibung (Englisch)" placeholder="Bildbeschreibung (Englisch)" className={INPUT} />
    </>
  );
}

export default async function GalleryPage() {
  await requireOwner();
  const photos = (await db()`select id, src, alt_de, alt_en, ratio, visible from gallery_photos order by sort`) as PhotoRow[];

  return (
    <>
      <PageTitle title="Galerie">
        <p className="text-sm text-mist">{photos.length} Fotos</p>
      </PageTitle>
      <Notice>
        Die Fotos im Bereich „Galerie“ auf der Startseite, in dieser Reihenfolge. Die Bildbeschreibung lesen
        Screenreader vor; sie sollte sagen, was zu sehen ist.
      </Notice>
      <div className="flex flex-col gap-4">
        {photos.length === 0 && <Empty>Noch keine Fotos.</Empty>}
        {photos.map((photo) => (
          <Panel key={photo.id}>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl md:w-48">
                <Image src={photo.src} alt="" fill sizes="192px" className={`object-cover ${photo.visible ? "" : "opacity-40"}`} />
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <form action={saveGalleryPhoto} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input type="hidden" name="id" value={photo.id} />
                  <PhotoFields photo={photo} />
                  <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                    <label className="label flex items-center gap-2 text-foam/80">
                      <input type="checkbox" name="visible" defaultChecked={photo.visible} className="h-4 w-4 accent-buoy" />
                      Sichtbar
                    </label>
                    <Submit variant="ghost">Speichern</Submit>
                  </div>
                </form>
                <div className="flex gap-2">
                  <form action={moveGalleryPhoto} className="flex gap-1">
                    <input type="hidden" name="id" value={photo.id} />
                    <Submit variant="ghost" name="direction" value="up" className="px-3">↑</Submit>
                    <Submit variant="ghost" name="direction" value="down" className="px-3">↓</Submit>
                  </form>
                  <form action={deleteGalleryPhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <Submit variant="danger" confirm="Dieses Foto aus der Galerie entfernen?">Entfernen</Submit>
                  </form>
                </div>
              </div>
            </div>
          </Panel>
        ))}
        <Panel>
          <h2 className="display mb-4 text-2xl text-foam">Foto hinzufügen</h2>
          <form action={saveGalleryPhoto} className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <PhotoFields />
            <div>
              <Submit>Hinzufügen</Submit>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
