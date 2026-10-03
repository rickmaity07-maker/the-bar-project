import { saveVenue } from "@/app/admin/content-actions";
import { Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { requireOwner } from "@/lib/auth";
import { getSiteData } from "@/lib/site-data";

function Field({ label, name, value, required, type = "text" }: { label: string; name: string; value: string; required?: boolean; type?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label text-foam">{label}</span>
      <input name={name} type={type} defaultValue={value} required={required} className={INPUT} />
    </label>
  );
}

export default async function VenuePage() {
  await requireOwner();
  const { venue } = await getSiteData();

  return (
    <>
      <PageTitle title="Bar & Kontakt" />
      <Notice>
        Diese Angaben stehen in der Fußzeile, im Bereich „Besuch“, bei der Reservierung, in der Datenschutzerklärung und
        in allen E-Mails an Gäste. Änderungen erscheinen sofort.
      </Notice>
      <Panel>
        <form action={saveVenue} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name der Bar" name="name" value={venue.name} required />
          <Field label="Ansprechpartner" name="contact_name" value={venue.contactName} />
          <Field label="Straße und Hausnummer" name="street" value={venue.street} required />
          <Field label="PLZ und Ort" name="postal_city" value={venue.postalCity} required />
          <Field label="Telefon" name="phone" type="tel" value={venue.phone} required />
          <Field label="Link zu Google Maps" name="maps_url" type="url" value={venue.mapsUrl} />
          <div className="md:col-span-2">
            <Submit>Speichern</Submit>
          </div>
        </form>
      </Panel>
    </>
  );
}
