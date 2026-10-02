import { createUser, resetPassword, setUserActive, setUserRole } from "@/app/admin/actions";
import { Notice, PageTitle, Panel } from "@/components/admin/Panel";
import { INPUT } from "@/components/admin/styles";
import { Submit } from "@/components/admin/ui";
import { formatStamp } from "@/lib/admin-format";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "user" | "owner";
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

const NOTICES: Record<string, { text: string; tone: "info" | "warn" }> = {
  created: { text: "Nutzer angelegt. Gebt das Passwort persönlich weiter.", tone: "info" },
  saved: { text: "Gespeichert.", tone: "info" },
  "password-reset": { text: "Passwort geändert. Andere Geräte dieses Kontos wurden abgemeldet.", tone: "info" },
  self: { text: "Das eigene Konto kann sich nicht selbst herabstufen oder deaktivieren.", tone: "warn" },
  lastOwner: { text: "Es muss immer mindestens einen aktiven Inhaber geben.", tone: "warn" },
  exists: { text: "Für diese E-Mail gibt es schon ein Konto.", tone: "warn" },
  email: { text: "Bitte eine gültige E-Mail-Adresse angeben.", tone: "warn" },
  password: { text: "Passwörter brauchen mindestens 8 Zeichen.", tone: "warn" },
};

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function UsersPage({ searchParams }: { searchParams: Params }) {
  const me = await requireOwner();
  const { notice } = await searchParams;
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;
  const users = (await db()`
    select id, email, name, role, active, created_at, last_login_at
    from users order by role desc, active desc, email
  `) as UserRow[];

  return (
    <>
      <PageTitle title="Nutzer & Rollen">
        <p className="text-sm text-mist">{users.length} Konten</p>
      </PageTitle>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Notice>
        Alle melden sich auf derselben Seite an (/login). Nur Konten mit der Rolle „Inhaber“ sehen die Verwaltung;
        neu registrierte Konten sind zunächst „Nutzer“ ohne Zugriff.
      </Notice>

      <div className="flex flex-col gap-4">
        {users.map((user) => {
          const self = user.id === me.id;
          return (
            <Panel key={user.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="display break-all text-2xl text-foam">{user.email}</p>
                  <p className="mt-1 text-sm text-mist">
                    {user.name || "Ohne Namen"} · angelegt {formatStamp(user.created_at)} · zuletzt angemeldet{" "}
                    {user.last_login_at ? formatStamp(user.last_login_at) : "nie"}
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
