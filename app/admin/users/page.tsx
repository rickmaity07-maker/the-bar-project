import { createUser, resetPassword, revokeUserSessions, setUserActive, setUserRole } from "@/app/admin/actions";
import { Empty, Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { formatStamp } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: "user" | "owner";
  active: boolean;
  created_at: string;
  last_login_at: string | null;
  bookings: number;
  sessions: number;
  google: boolean;
  has_password: boolean;
}

const ROLE_FILTERS = ["all", "owner", "user", "inactive"];
const PAGE_SIZE = 50;

const NOTICES: Record<string, { text: string; tone: "info" | "warn" }> = {
  created: { text: "Nutzer angelegt. Gebt das Passwort persönlich weiter.", tone: "info" },
  saved: { text: "Gespeichert.", tone: "info" },
  "password-reset": { text: "Passwort geändert. Andere Geräte dieses Kontos wurden abgemeldet.", tone: "info" },
  self: { text: "Das eigene Konto kann sich nicht selbst herabstufen oder deaktivieren.", tone: "warn" },
  lastOwner: { text: "Es muss immer mindestens einen aktiven Inhaber geben.", tone: "warn" },
  exists: { text: "Für diese E-Mail gibt es schon ein Konto.", tone: "warn" },
  email: { text: "Bitte eine gültige E-Mail-Adresse angeben.", tone: "warn" },
  password: { text: "Passwörter brauchen 8 bis 256 Zeichen.", tone: "warn" },
  missing: { text: "Dieses Konto gibt es nicht (mehr).", tone: "warn" },
  "signed-out": { text: "Das Konto wurde auf allen Geräten abgemeldet.", tone: "info" },
};

type Params = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export default async function UsersPage({ searchParams }: { searchParams: Params }) {
  const me = await requireOwner();
  const params = await searchParams;
  const message = NOTICES[first(params.notice)];
  const q = first(params.q).trim().slice(0, 100);
  const filter = ROLE_FILTERS.includes(first(params.role)) ? first(params.role) : "all";
  const page = Math.max(0, Number.parseInt(first(params.page), 10) || 0);
  const like = `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;

  const sql = db();
  const [users, [{ total }]] = (await Promise.all([
    sql`
      select id, email, name, phone, role, active, created_at, last_login_at,
        (select count(*)::int from reservations r where r.user_id = users.id) as bookings,
        (select count(*)::int from sessions s where s.user_id = users.id and s.expires_at > now()) as sessions,
        google_sub is not null as google, password_hash <> '' as has_password
      from users
      where (${q} = '' or email ilike ${like} or name ilike ${like} or phone ilike ${like})
        and (${filter} = 'all' or (${filter} = 'inactive' and not active) or (${filter} <> 'inactive' and role = ${filter}))
      order by role desc, active desc, email
      limit ${PAGE_SIZE + 1} offset ${page * PAGE_SIZE}
    `,
    sql`select count(*)::int as total from users`,
  ])) as [UserRow[], { total: number }[]];
  const hasMore = users.length > PAGE_SIZE;
  const link = (next: Record<string, string | number>) =>
    `/admin/users?${new URLSearchParams({ q, role: filter, page: String(page), ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])) })}`;

  return (
    <>
      <PageTitle title="Nutzer & Rollen">
        <p className="text-sm text-mist">{total} Konten</p>
      </PageTitle>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <form className="mb-6 flex flex-wrap gap-2">
        <select name="role" defaultValue={filter} aria-label="Rolle" className={`${INPUT} w-auto pr-8`}>
          <option value="all">Alle Konten</option>
          <option value="owner">Nur Inhaber</option>
          <option value="user">Nur Nutzer</option>
          <option value="inactive">Deaktiviert</option>
        </select>
        <input name="q" defaultValue={q} placeholder="E-Mail, Name, Telefon" aria-label="Suche" className={`${INPUT} w-56`} />
        <button type="submit" className="label rounded-full bg-buoy px-5 py-2.5 text-abyss transition-colors hover:bg-foam">
          Filtern
        </button>
        <a href="/admin/users" className="label flex items-center px-3 text-mist hover:text-foam">
          Zurücksetzen
        </a>
      </form>
      <Notice>
        Alle melden sich auf derselben Seite an (/login). Gäste brauchen ein Konto, um zu reservieren, und sehen ihre
        Reservierungen im Profil. Nur Konten mit der Rolle „Inhaber“ sehen die Verwaltung.
      </Notice>

      <div className="flex flex-col gap-4">
        {users.length === 0 && <Empty>Keine Konten für diese Auswahl.</Empty>}
        {users.slice(0, PAGE_SIZE).map((user) => {
          const self = user.id === me.id;
          return (
            <Panel key={user.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="display break-all text-2xl text-foam">{user.email}</p>
                  <p className="mt-1 text-sm text-mist">
                    {user.name || "Ohne Namen"}
                    {user.phone && ` · ${user.phone}`} · {user.bookings}{" "}
                    {user.bookings === 1 ? "Reservierung" : "Reservierungen"} · angelegt {formatStamp(user.created_at)} ·
                    zuletzt angemeldet {user.last_login_at ? formatStamp(user.last_login_at) : "nie"} ·{" "}
                    {user.sessions === 1 ? "1 aktive Sitzung" : `${user.sessions} aktive Sitzungen`} · Anmeldung mit{" "}
                    {[user.has_password && "Passwort", user.google && "Google"].filter(Boolean).join(" und ") || "–"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`label rounded-full px-3 py-1.5 text-[10px] ${
                      user.role === "owner" ? "bg-buoy text-abyss" : "bg-foam/15 text-foam"
                    }`}
                  >
                    {user.role === "owner" ? "Inhaber" : "Nutzer"}
                  </span>
                  {!user.active && (
                    <span className="label rounded-full bg-foam/10 px-3 py-1.5 text-[10px] text-mist">Deaktiviert</span>
                  )}
                  {self && <span className="label rounded-full px-3 py-1.5 text-[10px] text-mist ring-1 ring-foam/20">Du</span>}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-foam/10 pt-5">
                {!self && (
                  <>
                    <form action={setUserRole}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="role" value={user.role === "owner" ? "user" : "owner"} />
                      <Submit
                        variant={user.role === "owner" ? "danger" : "solid"}
                        confirm={
                          user.role === "owner"
                            ? `${user.email} den Zugriff auf die Verwaltung entziehen?`
                            : `${user.email} zum Inhaber machen? Das Konto erhält vollen Zugriff.`
                        }
                      >
                        {user.role === "owner" ? "Zum Nutzer herabstufen" : "Zum Inhaber machen"}
                      </Submit>
                    </form>
                    <form action={setUserActive}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="active" value={user.active ? "false" : "true"} />
                      <Submit variant={user.active ? "danger" : "ghost"}>
                        {user.active ? "Deaktivieren" : "Aktivieren"}
                      </Submit>
                    </form>
                  </>
                )}
                {user.sessions > (self ? 1 : 0) && (
                  <form action={revokeUserSessions}>
                    <input type="hidden" name="id" value={user.id} />
                    <Submit
                      variant="ghost"
                      confirm={self ? "Alle anderen Geräte abmelden?" : `${user.email} auf allen Geräten abmelden?`}
                    >
                      {self ? "Andere Geräte abmelden" : "Überall abmelden"}
                    </Submit>
                  </form>
                )}
                <form action={resetPassword} className="flex flex-1 gap-2 sm:min-w-[22rem]">
                  <input type="hidden" name="id" value={user.id} />
                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    placeholder="Neues Passwort"
                    aria-label={`Neues Passwort für ${user.email}`}
                    className={INPUT}
                  />
                  <Submit variant="ghost">Setzen</Submit>
                </form>
              </div>
            </Panel>
          );
        })}

        {(page > 0 || hasMore) && (
          <div className="flex gap-3">
            {page > 0 && (
              <a href={link({ page: page - 1 })} className="label rounded-full px-5 py-3 text-foam ring-1 ring-foam/25 hover:bg-foam/10">
                Zurück
              </a>
            )}
            {hasMore && (
              <a href={link({ page: page + 1 })} className="label rounded-full px-5 py-3 text-foam ring-1 ring-foam/25 hover:bg-foam/10">
                Weitere
              </a>
            )}
          </div>
        )}

        <Panel>
          <h2 className="display text-3xl text-foam">Konto anlegen</h2>
          <form action={createUser} className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input type="email" name="email" required placeholder="E-Mail" aria-label="E-Mail" className={INPUT} />
            <input name="name" placeholder="Name" aria-label="Name" className={INPUT} />
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Startpasswort (mindestens 8 Zeichen)"
              aria-label="Startpasswort"
              className={INPUT}
            />
            <select name="role" defaultValue="user" aria-label="Rolle" className={INPUT}>
              <option value="user">Nutzer (kein Zugriff)</option>
              <option value="owner">Inhaber (voller Zugriff)</option>
            </select>
            <div>
              <Submit>Konto anlegen</Submit>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
