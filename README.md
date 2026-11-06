# Bar-05

Website, table bookings and admin portal for Bar-05, Kornmarkt 7, Schweinfurt.

- **Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4, GSAP, Lenis, motion
- **Data:** Neon Postgres (serverless HTTP driver), region `eu-central-1`
- **Hosting:** Vercel, region `fra1` (Frankfurt), with a daily cron job
- **Email:** Gmail (App Password) or any SMTP server, via nodemailer
- **Sign-in:** email and password (scrypt), or Google (OAuth 2.0 with PKCE)

> This Next.js version differs from older ones (for example `proxy.ts` replaces `middleware.ts`). Check `node_modules/next/dist/docs/` before changing framework code (see `AGENTS.md`).

## What is where

| Path | What it does |
| --- | --- |
| `app/page.tsx`, `components/` | The public one-page site. Without a database it shows the built-in menu and hours. |
| `app/login`, `app/api/auth/google` | One login for everyone. Owners go to `/admin`, guests to `/profile`. |
| `app/profile` | A guest's bookings, details, password, Google link, data download and account deletion (DSGVO Art. 15, 17, 20). |
| `app/api/reserve` | Booking endpoint (signed-in accounts only). |
| `app/admin` | Owner portal: reservations (filters, pages, CSV export), menu, hours, closed days, venue details, nights, gallery, users and roles, activity log. |
| `app/api/cron/cleanup` | Daily deletion of old data (retention periods in `lib/retention.ts`). |
| `lib/auth.ts` | Password hashing, sessions (only a SHA-256 hash of the token is stored), `requireUser` / `requireOwner`. |
| `lib/security.ts` | UUID checks, IP keys (HMAC, never the plain address), rate limits, same-origin check, email link origin. |
| `lib/csp.ts`, `proxy.ts`, `next.config.ts` | Security headers and the Content Security Policy. |
| `db/schema.sql` | The whole schema. Idempotent: safe to run again after every update. |
| `e2e/` | Playwright walkthrough of the whole site (see `e2e/README.md`). |

## Local setup

```bash
npm ci
cp .env.example .env.local      # then fill in the values (see below)
npm run db:setup -- owner@example.com "a-long-password"   # tables + first owner account
npm run db:seed                 # optional: venue, nights and gallery from the built-in defaults
npm run dev                     # http://localhost:3000
```

`npm run db:setup` without arguments only updates the schema. Run it again **after every update that changes `db/schema.sql`**. It never deletes data.

Checks before a commit:

```bash
npm run lint
npm run build
npm run test:e2e    # needs a Neon test branch, see e2e/README.md
```

## Environment variables

Put them in `.env.local` for local runs, and in Vercel under *Project → Settings → Environment Variables* for Production (and Preview, if previews should work).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon connection string. Without it the public site still renders, but there is no login and no booking. |
| `CRON_SECRET` | yes on Vercel | Vercel Cron sends it to `/api/cron/cleanup`. Without it the clean-up refuses every call, and old data is not deleted. |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | for email | Sender account. Needs 2-Step Verification and an App Password. |
| `GMAIL_FROM_NAME` | no | Sender name (default `Bar-05`). |
| `RESERVATION_NOTIFY_EMAIL` | for email | Where new bookings and cancellations go. Several addresses: separate with commas. |
| `SMTP_HOST`, `SMTP_PORT` | no | Use another mail server with the same user and password. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in | OAuth client (type *Web application*). The Google button appears once both are set. |
| `SITE_URL` | no | Public address used in links inside emails, for example `https://bar-05.de`. Defaults to Vercel's production domain. |
| `RATE_LIMIT_SECRET` | no | Key for the hashed IP addresses used by rate limits. Defaults to `DATABASE_URL`. |

Google OAuth client: add these *Authorized redirect URIs*:

- `https://<your-domain>/api/auth/google/callback`
- `http://localhost:3000/api/auth/google/callback` (local development)

## Deploying on Vercel

1. Import the repository in Vercel. The framework preset is detected; `vercel.json` sets the region to `fra1` and the daily cron (03:00 UTC).
2. Add the environment variables above, at least `DATABASE_URL` and `CRON_SECRET`.
3. Before (or right after) the first deploy of a version with schema changes, run `npm run db:setup` against the production database once, from a machine whose `.env.local` holds the production `DATABASE_URL`.
4. Deploy. Owners sign in at `/login`.

## Security notes

- **Sessions:** random 256-bit token in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only its hash is stored. Sessions last five days. The role and the active flag are read from the database on every request, so a demotion or deactivation applies at once.
- **Server actions:** each admin action calls `requireOwner()` itself and checks ids as UUIDs, enums against lists, and text lengths. Next.js checks the Origin of every server action.
- **Last owner:** demoting or deactivating runs behind a Postgres advisory lock and only succeeds while another active owner remains. An owner cannot demote, deactivate or delete their own account if they are the only owner.
- **Login throttling:** 8 failures per email address or 30 per IP address in 15 minutes block sign-in (email and Google). The IP is stored only as an HMAC. Unknown emails still take one scrypt check, so response times do not reveal which addresses have an account.
- **Google linking policy:** an account already linked to the Google id signs in. A **guest** account with the same verified email is linked, and its password is removed and its sessions ended, because a password set at sign-up never proved ownership of the address (pre-account-takeover). An **owner** account is never linked automatically: the owner signs in with the password and links Google in the profile (`/api/auth/google?link=1`). Google can be unlinked only while a password is set.
- **Bookings API:** same-origin only (Origin and `Sec-Fetch-Site` checks), JSON only, at most 16 KB, 20 requests per account and 60 per IP per hour, and every field validated (`lib/reservation.ts`).
- **Content:** image fields only accept photos in `/public/photos`, and the map link only https links to Google Maps, OpenStreetMap, Apple Maps or Bing Maps. Both are checked again when the page renders.
- **CSP:** `/admin`, `/profile` and `/login` get a per-request nonce policy (`'strict-dynamic'`, no inline scripts). The prerendered public pages cannot carry a nonce, so they allow `'unsafe-inline'` scripts but nothing from other origins. Styles allow `'unsafe-inline'` everywhere because React renders `style` attributes. Details in `lib/csp.ts`.
- **CSV export:** cells starting with `= + - @` are prefixed so they never run as spreadsheet formulas.
- **Retention:** bookings 6 months after the date, activity log 12 months, login attempts and rate counters 24 hours, expired sessions right away (`lib/retention.ts`, stated in the privacy policy at `/datenschutz`).
