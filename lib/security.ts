import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/*
  Shared request checks: who is asking (by a keyed hash of the IP address, never
  the address itself), how often, and from where.
*/

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

/*
  The client address, for rate limits only. On Vercel (process.env.VERCEL is
  set) the edge network overwrites x-real-ip and x-forwarded-for with the real
  client, so a visitor cannot choose them. Anywhere else (next start on a
  server, a local run, the e2e suite) nothing guarantees a proxy rewrites those
  headers: trusting them would let anyone pick a fresh "IP" per request and
  slip past every per-IP limit. There, every request shares one fixed bucket,
  which errs on the side of limiting too much. Behind another trusted proxy,
  adapt this function to that proxy's header.
*/
const SHARED_IP_BUCKET = "untrusted-proxy";
export function clientIp(source: Headers) {
  if (!process.env.VERCEL) return SHARED_IP_BUCKET;
  const forwarded = source.get("x-forwarded-for")?.split(",")[0]?.trim();
  return source.get("x-real-ip")?.trim() || forwarded || SHARED_IP_BUCKET;
}

/*
  One advisory lock for every change that could leave the bar without an
  active owner (role and active changes in the admin portal, an owner deleting
  their own account). Taken inside each transaction with pg_advisory_xact_lock.
*/
export const OWNER_LOCK = 5_050_505;

/*
  Pseudonymised (Art. 4 Nr. 5 DSGVO): an HMAC, so the stored value cannot be
  turned back into an address by trying all of them. RATE_LIMIT_SECRET is
  optional; without it the database URL, which is secret anyway, is the key.
*/
export function ipKey(source: Headers) {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.DATABASE_URL || "bar-05";
  return createHmac("sha256", secret).update(clientIp(source)).digest("hex").slice(0, 32);
}

export async function requestIpKey() {
  return ipKey(await headers());
}

/*
  Counts this request and says whether the caller is over the limit. The count
  excludes the request being recorded, so `limit` requests per window pass.
*/
export async function overLimit(bucket: string, key: string, limit: number, windowSeconds: number) {
  const [{ hits }] = (await db()`
    with recorded as (insert into rate_events (bucket, key) values (${bucket}, ${key}) returning 1)
    select count(*)::int as hits from rate_events
    where bucket = ${bucket} and key = ${key} and at > now() - make_interval(secs => ${windowSeconds})
  `) as { hits: number }[];
  return hits >= limit;
}

/*
  Same-origin check for JSON endpoints that use the session cookie. Browsers
  always send Origin on a cross-site POST and Sec-Fetch-Site on modern ones;
  a request without either cannot carry a victim's cookie from another site.
*/
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

/*
  The address used in links inside emails. SITE_URL wins, then Vercel's
  production domain, so a forged Host header cannot put a foreign link into a
  guest's inbox. The request's own origin is the last resort (local runs).
*/
export function siteOrigin(fallback: string) {
  const configured = process.env.SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel && process.env.VERCEL_ENV === "production") return `https://${vercel}`;
  return fallback;
}
