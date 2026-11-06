import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isGoogleConfigured } from "@/lib/google";
import ProfileView, { type GoogleNotice, type MyReservation } from "./ProfileView";

export const metadata: Metadata = {
  title: "Profil | Bar-05",
  robots: { index: false },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const NOTICES: GoogleNotice[] = ["linked", "taken", "unlinked"];

/* Every signed-in account has a profile; owners also get a link to the admin portal. */
export default async function ProfilePage({ searchParams }: { searchParams: Params }) {
  const me = await requireUser();
  const { google } = await searchParams;
  const sql = db();
  const [reservations, [account]] = (await Promise.all([
    sql`
      select id, date::text as date, to_char(time, 'HH24:MI') as time, to_char(end_time, 'HH24:MI') as end_time,
             guests, is_private, status,
             date >= (now() at time zone 'Europe/Berlin')::date as upcoming
      from reservations
      where user_id = ${me.id}
      order by date desc, time desc
      limit 100
    `,
    sql`select password_hash <> '' as has_password, google_sub is not null as google_linked from users where id = ${me.id}`,
  ])) as [MyReservation[], { has_password: boolean; google_linked: boolean }[]];

  return (
    <ProfileView
      me={me}
      reservations={reservations}
      hasPassword={account.has_password}
      google={{
        available: isGoogleConfigured(),
        linked: account.google_linked,
        notice: NOTICES.find((notice) => notice === google) ?? null,
      }}
    />
  );
}
