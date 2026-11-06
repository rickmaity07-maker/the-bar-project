import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, hasDatabase } from "@/lib/db";

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: string,
  length: number,
  options: ScryptParams & { maxmem: number },
) => Promise<Buffer>;

/*
  In production the cookie is "__Host-session": browsers only accept that name
  with Secure, Path=/ and no Domain, so a sibling subdomain or a plain-HTTP
  response cannot plant or overwrite it (session fixation). Local development
  over http://localhost keeps the plain name.
*/
const PRODUCTION = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = PRODUCTION ? "__Host-session" : "session";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 5;
const SESSION_COOKIE_OPTIONS = { httpOnly: true, secure: PRODUCTION, sameSite: "lax", path: "/" } as const;

export type Role = "user" | "owner";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
}

/*
  Password hashes: scrypt$<N>$<r>$<p>$<salt hex>$<hash hex>, so the cost can be
  raised later without breaking old hashes. N = 2^17, r = 8 needs 128 MiB per
  check (OWASP's recommended minimum); maxmem leaves room above that.
  scripts/setup-db.mjs writes the same format.

  The first version stored scrypt$<salt hex>$<hash hex> with Node's defaults
  (N = 2^14, r = 8, p = 1). Those still verify, and a successful sign-in
  rewrites them with the current parameters (see needsRehash).
*/
export const SCRYPT_PARAMS: ScryptParams = { N: 2 ** 17, r: 8, p: 1 };
const LEGACY_PARAMS: ScryptParams = { N: 2 ** 14, r: 8, p: 1 };
const maxmem = ({ N, r }: ScryptParams) => 256 * N * r;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const { N, r, p } = SCRYPT_PARAMS;
  const hash = await scryptAsync(password, salt, 64, { N, r, p, maxmem: maxmem(SCRYPT_PARAMS) });
  return `scrypt$${N}$${r}$${p}$${salt}$${hash.toString("hex")}`;
}

/* Longer input only costs scrypt time; nobody types more than this. */
export const MAX_PASSWORD_LENGTH = 256;

const LEGACY_FORMAT = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/;
const HASH_FORMAT = /^scrypt\$(\d{1,8})\$(\d{1,2})\$(\d{1,2})\$([0-9a-f]{32})\$([0-9a-f]{128})$/;

/* Bounds keep a tampered row from asking for gigabytes of memory or an endless loop. */
function parseHash(stored: string): { params: ScryptParams; salt: string; hash: string } | null {
  const legacy = LEGACY_FORMAT.exec(stored);
  if (legacy) return { params: LEGACY_PARAMS, salt: legacy[1], hash: legacy[2] };
  const match = HASH_FORMAT.exec(stored);
  if (!match) return null;
  const params = { N: Number(match[1]), r: Number(match[2]), p: Number(match[3]) };
  const powerOfTwo = (params.N & (params.N - 1)) === 0;
  if (!powerOfTwo || params.N < 2 ** 14 || params.N > 2 ** 20 || params.r < 1 || params.r > 16 || params.p < 1 || params.p > 4) {
    return null;
  }
  return { params, salt: match[4], hash: match[5] };
}

/*
  Never throws and never accepts a malformed stored value: an odd or empty hex
  string would otherwise decode to a short (even empty) buffer that a derived
  key of the same length matches. An empty or malformed hash (a Google-only
  account) still costs one full scrypt run, so the response time does not tell
  such accounts apart.
*/
export async function verifyPassword(password: string, stored: string) {
  const parsed = parseHash(stored);
  if (!parsed || password.length > MAX_PASSWORD_LENGTH) {
    await burnPasswordCheck(password);
    return false;
  }
  try {
    const expected = Buffer.from(parsed.hash, "hex");
    const actual = await scryptAsync(password, parsed.salt, expected.length, {
      ...parsed.params,
      maxmem: maxmem(parsed.params),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/* True when a stored hash uses weaker parameters than SCRYPT_PARAMS and should be rewritten. */
export function needsRehash(stored: string) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const { N, r, p } = parsed.params;
  return N !== SCRYPT_PARAMS.N || r !== SCRYPT_PARAMS.r || p !== SCRYPT_PARAMS.p;
}

/* Spent on unknown emails too, so the response time does not reveal which addresses have an account. */
export async function burnPasswordCheck(password: string) {
  const { N, r, p } = SCRYPT_PARAMS;
  try {
    await scryptAsync(password.slice(0, MAX_PASSWORD_LENGTH), "0".repeat(32), 64, { N, r, p, maxmem: maxmem(SCRYPT_PARAMS) });
  } catch {
    // Only the time matters.
  }
}

/* Only a hash of the token is stored, so a leaked sessions table cannot be replayed. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const sql = db();
  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, now() + make_interval(secs => ${SESSION_MAX_AGE_S}))
  `;
  await sql`delete from sessions where expires_at < now()`;
  (await cookies()).set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_S });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && hasDatabase()) await db()`delete from sessions where token_hash = ${hashToken(token)}`;
  // Expired with the same attributes: a __Host- cookie is only replaced by one that is Secure with Path=/.
  store.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}

/* The role is read from the database on every request, so a demotion or deactivation applies at once. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  // Cookies first: every page that asks who is signed in renders per request (and gets its CSP nonce),
  // even in a build without a database.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !hasDatabase()) return null;
  const rows = await db()`
    select u.id, u.email, u.name, u.phone, u.role
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now() and u.active
  `;
  return (rows[0] as SessionUser | undefined) ?? null;
});

/* Signs the account out on every other device, keeping this browser's session. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db()`delete from sessions where user_id = ${userId} and token_hash <> ${hashToken(token)}`;
}

/*
  Only paths on this site, so a crafted link cannot send someone elsewhere after
  login. Browsers drop tabs and newlines from URLs and read "\" as "/", so
  "/\t/evil.com" or "/\evil.com" would become "//evil.com": any control
  character, whitespace or backslash is refused outright, and the result must
  still resolve to this origin.
*/
const UNSAFE_IN_PATH = /[\x00-\x20\x7f\\]/;
export function safeNext(value: unknown) {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || UNSAFE_IN_PATH.test(next)) return "";
  try {
    return new URL(next, "http://x").origin === "http://x" ? next : "";
  } catch {
    return "";
  }
}

/* Any signed-in account: the profile page and its actions. */
export async function requireUser(next = "/profile"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/* Guards every admin page and every admin action. */
export async function requireOwner(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.role !== "owner") redirect("/login");
  return session;
}
