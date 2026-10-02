import {
  deleteCategory,
  deleteItem,
  importDefaultMenu,
  moveCategory,
  moveItem,
  saveCategory,
  saveItem,
} from "@/app/admin/actions";
import { Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

interface CategoryRow {
  id: string;
  name_de: string;
  name_en: string;
  line_de: string;
  line_en: string;
  visible: boolean;
}

interface ItemRow {
  id: string;
  category_id: string;
  name_de: string;
  name_en: string;
  note_de: string;
  note_en: string;
  price: string;
  visible: boolean;
}

function Hidden({ values }: { values: Record<string, string> }) {
  return Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />);
}

function MoveButtons({ action, values }: { action: (form: FormData) => Promise<void>; values: Record<string, string> }) {
  return (
    <form action={action} className="flex gap-1">
      <Hidden values={values} />
      <Submit variant="ghost" name="direction" value="up" className="px-3">
        ↑
      </Submit>
      <Submit variant="ghost" name="direction" value="down" className="px-3">
        ↓
      </Submit>
    </form>
  );
}

function Visible({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="label flex items-center gap-2 text-foam/80">
      <input type="checkbox" name="visible" defaultChecked={defaultChecked} className="h-4 w-4 accent-buoy" />
      Sichtbar
    </label>
  );
}

export default async function MenuPage() {
  await requireOwner();
  const sql = db();
  const [categories, items] = (await Promise.all([
    sql`select id, name_de, name_en, line_de, line_en, visible from menu_categories order by sort, name_de`,
    sql`select id, category_id, name_de, name_en, note_de, note_en, price, visible from menu_items order by sort, name_de`,
  ])) as [CategoryRow[], ItemRow[]];

  if (categories.length === 0) {
    return (
      <>
        <PageTitle title="Karte & Preise" />
        <Panel>
          <p className="max-w-[60ch] text-base leading-relaxed text-foam/90">
            Die Website zeigt gerade die eingebaute Karte. Übernehmt sie einmal in die Datenbank, dann lassen sich
            alle Getränke, Preise und Kategorien hier bearbeiten.
          </p>
          <form action={importDefaultMenu} className="mt-6">
            <Submit>Aktuelle Karte übernehmen</Submit>
          </form>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Karte & Preise">
        <p className="text-sm text-mist">
          {categories.length} Kategorien · {items.length} Getränke
        </p>
      </PageTitle>
      <Notice>
        Änderungen erscheinen sofort auf der Website. Preise so schreiben, wie sie auf der Karte stehen, zum Beispiel
        „3,50“ oder „3,00 / 4,00“. Fehlt die englische Fassung, zeigt die Website die deutsche.
      </Notice>

      <div className="flex flex-col gap-6">
        {categories.map((category) => {
          const own = items.filter((item) => item.category_id === category.id);
          return (
            <Panel key={category.id}>
              <details open>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <span className="display text-3xl text-foam">
                    {category.name_de}
                    {!category.visible && <span className="label ml-3 align-middle text-mist">Ausgeblendet</span>}
                  </span>
                  <span className="label text-mist">{own.length} Getränke</span>
                </summary>

                <div className="mt-5 flex flex-wrap items-start gap-2">
                  <form action={saveCategory} className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
                    <Hidden values={{ id: category.id }} />
                    <input name="name_de" defaultValue={category.name_de} required aria-label="Name (Deutsch)" placeholder="Name (Deutsch)" className={INPUT} />
                    <input name="name_en" defaultValue={category.name_en} aria-label="Name (Englisch)" placeholder="Name (Englisch)" className={INPUT} />
                    <input name="line_de" defaultValue={category.line_de} aria-label="Beschreibung (Deutsch)" placeholder="Beschreibung (Deutsch)" className={INPUT} />
                    <input name="line_en" defaultValue={category.line_en} aria-label="Beschreibung (Englisch)" placeholder="Beschreibung (Englisch)" className={INPUT} />
                    <div className="flex flex-wrap items-center gap-4 md:col-span-2">
                      <Visible defaultChecked={category.visible} />
                      <Submit variant="ghost">Kategorie speichern</Submit>
                    </div>
                  </form>
                  <MoveButtons action={moveCategory} values={{ id: category.id }} />
                  <form action={deleteCategory}>
                    <Hidden values={{ id: category.id }} />
                    <Submit variant="danger" confirm={`„${category.name_de}“ mit allen ${own.length} Getränken löschen?`}>
                      Löschen
                    </Submit>
                  </form>
                </div>

                <ul className="mt-6 flex flex-col gap-3">
                  {own.map((item) => (
                    <li key={item.id} className="rounded-3xl bg-abyss/60 p-4 ring-1 ring-foam/10">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
                        <form action={saveItem} className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_9rem]">
                          <Hidden values={{ id: item.id, category_id: category.id }} />
                          <input name="name_de" defaultValue={item.name_de} required aria-label="Name (Deutsch)" placeholder="Name (Deutsch)" className={INPUT} />
                          <input name="name_en" defaultValue={item.name_en} aria-label="Name (Englisch)" placeholder="Name (Englisch)" className={INPUT} />
                          <input name="price" defaultValue={item.price} required aria-label="Preis" placeholder="Preis" className={`${INPUT} text-buoy`} />
                          <input name="note_de" defaultValue={item.note_de} aria-label="Hinweis (Deutsch)" placeholder="Hinweis (Deutsch)" className={`${INPUT} md:col-span-1`} />
                          <input name="note_en" defaultValue={item.note_en} aria-label="Hinweis (Englisch)" placeholder="Hinweis (Englisch)" className={INPUT} />
                          <div className="flex items-center justify-between gap-3">
                            <Visible defaultChecked={item.visible} />
                            <Submit variant="ghost">Speichern</Submit>
                          </div>
                        </form>
                        <div className="flex gap-2">
                          <MoveButtons action={moveItem} values={{ id: item.id, category_id: category.id }} />
                          <form action={deleteItem}>
                            <Hidden values={{ id: item.id }} />
                            <Submit variant="danger" confirm={`„${item.name_de}“ löschen?`}>
                              Löschen
                            </Submit>
                          </form>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <form action={saveItem} className="mt-4 grid grid-cols-1 gap-2 rounded-3xl p-4 ring-1 ring-dashed ring-foam/20 md:grid-cols-[1fr_1fr_9rem_auto]">
                  <Hidden values={{ category_id: category.id }} />
                  <input name="name_de" required aria-label="Neues Getränk (Deutsch)" placeholder="Neues Getränk (Deutsch)" className={INPUT} />
                  <input name="name_en" aria-label="Name (Englisch)" placeholder="Name (Englisch)" className={INPUT} />
                  <input name="price" required aria-label="Preis" placeholder="Preis" className={INPUT} />
                  <Submit>Hinzufügen</Submit>
                  <input name="note_de" aria-label="Hinweis (Deutsch)" placeholder="Hinweis (Deutsch)" className={INPUT} />
                  <input name="note_en" aria-label="Hinweis (Englisch)" placeholder="Hinweis (Englisch)" className={INPUT} />
                </form>
              </details>
            </Panel>
          );
        })}

        <Panel>
          <h2 className="display text-3xl text-foam">Neue Kategorie</h2>
          <form action={saveCategory} className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input name="name_de" required aria-label="Name (Deutsch)" placeholder="Name (Deutsch)" className={INPUT} />
            <input name="name_en" aria-label="Name (Englisch)" placeholder="Name (Englisch)" className={INPUT} />
            <input name="line_de" aria-label="Beschreibung (Deutsch)" placeholder="Beschreibung (Deutsch)" className={INPUT} />
            <input name="line_en" aria-label="Beschreibung (Englisch)" placeholder="Beschreibung (Englisch)" className={INPUT} />
            <div>
              <Submit>Kategorie anlegen</Submit>
            </div>
          </form>
          <p className="mt-3 text-sm text-mist">Eine Kategorie erscheint auf der Website, sobald sie ein Getränk enthält.</p>
        </Panel>
      </div>
    </>
  );
}
