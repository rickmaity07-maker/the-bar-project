# Bar-05 – Security, Quality & Performance Audit

**Date:** 2026-11-15 · **Folder:** `Bar-05-worker` (branch `finish-backend`) · **Stack:** Next.js 16.4.5, React 19, Neon Postgres, Vercel

`Bar-05` (branch `main`) and `Bar-05-worker` (branch `finish-backend`) are the same git repository. `finish-backend` is 5 commits ahead of `main` and has the newest code, so this audit ran there.

## Summary

| Area | Result |
|---|---|
| Production dependency vulnerabilities | **0** (`npm audit --omit=dev`) |
| Authorization | Every admin action (25) checks `requireOwner()`, every profile action (5) checks `requireUser()`, and both export routes check the session themselves |
| TypeScript / ESLint | 0 errors / 0 warnings |
| Unit tests | **None before → 30 new** (`npm test`, all passing) |
| CI | **None before → GitHub Actions** (audit, typecheck, lint, tests, build) |
| Browser check (phone 390 px + laptop 1440 px) | `/`, `/login`, `/datenschutz` and 404 pages: no CSP violations, no script errors, no sideways scrolling |

## What was already in good shape (checked, no change needed)

- Passwords: scrypt N=2^17 with the cost stored in the hash, rehash on sign-in, constant-time compare, the same time spent for unknown emails, and a 256-character cap.
- Sessions: only a SHA-256 of the token is stored, `__Host-` cookie in production, the role is re-read from the database on every request, and "sign out everywhere" is available.
- Open redirect after login (`?next=`): refuses `//`, `\`, tabs/newlines and other origins.
- Rate limits in Postgres (shared across servers): sign-in lockout per email+IP, 5 sign-ups per IP per hour, and booking limits per account and per IP. IPs are stored only as an HMAC.
- Booking API: same-origin check, JSON only, body capped at 16 KB while it streams, control characters stripped from fields that reach mail headers.
- CSV export escapes spreadsheet formulas (`= + - @`).
- CSP: a nonce with `strict-dynamic` on `/admin`, `/profile` and `/login`; the public pages are static and use `'unsafe-inline'` (no `unsafe-eval` in production), with `frame-ancestors 'none'` and `object-src 'none'`.
- Cron cleanup uses a constant-time check of the secret; retention periods are listed in `lib/retention.ts` and on the Datenschutz page.

## Fixed in this audit

1. **Bookings for a day that had already passed (bug).** `validateReservation` took "today" from the server clock, and Vercel runs in UTC, so between midnight and 1–2 a.m. German time a guest could still book the previous day. It now uses `berlinToday()` (Europe/Berlin), compares ISO dates as strings, and takes an optional `now` so it can be tested.
2. **No 404 page, error page or health check.** Added `app/not-found.tsx` (in the site's look, German + English), `app/error.tsx` (with a retry button) and `GET /api/health` for uptime monitors (it reports only `ok` and the database status). The 404 page renders per request so it gets the CSP nonce; a prebuilt page has no nonce, and its scripts would be blocked under `/admin` and `/profile`.
3. **No unit tests.** Added Vitest (`npm test`):
   - `tests/unit/security.test.ts`:
     - open redirect cases
     - password hash, verify and rehash, including tampered or empty hashes and over-long passwords
     - UUID check
     - forwarded IPs trusted only on Vercel
     - same-origin check
     - CSP nonce
   - `tests/unit/reservation.test.ts`:
     - Berlin "today" in summer and winter
     - impossible dates and times
     - a day that already passed in Germany while UTC is still on it
     - the two-year limit
     - closed weekdays and closed dates
     - guest limits for tables and private events
     - private-event fields
     - name and phone checks
4. **No CI.** Added `.github/workflows/ci.yml`: `npm install`, `npm audit --omit=dev --audit-level=high`, typecheck, lint, tests and build on Node 24, for `main`, `finish-backend` and pull requests.
5. `package.json`: new scripts `typecheck` (`next typegen && tsc --noEmit`), `test` and `audit`; dev dependencies `vitest` and `@types/node@24` (vitest 5 needs Node types 22 or newer).

## Not run, and why

- **Full Playwright walkthrough (`npm run test:e2e`).** It needs `GMAIL_USER` and `GMAIL_APP_PASSWORD`, because it sends real test emails and checks the inbox over IMAP. Neither `.env.local` has them. Add them to `Bar-05-worker/.env.local` and run `npm run test:e2e`; it uses the Neon test branch from `.env.test.local` and never the live database.

## Action needed (owner/developer)

1. **The live site does not have the latest security work yet.** `origin/main` (last pushed 2026-10-15) is 16 commits behind local `main`, and `finish-backend` is 5 more ahead (21 in total). These include the open-redirect fix, the stronger scrypt cost, sign-up limits, the `__Host-` cookie and the mail-header fix. Merge `finish-backend` into `main` and push.
2. `Bar-05` has one uncommitted line in `.gitignore` (`graphify-out/`, from the code-graph tool); commit it with the merge.

## Known remaining items (by choice)

- Booking times are only checked as clock times (`HH:MM`), not against opening hours. That's fine because every booking is a request the owner confirms, but the form could offer only opening-hour slots.
- The public pages keep `'unsafe-inline'` for scripts, because they are prerendered for speed. Changing that would make every public page render per request.
