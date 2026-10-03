# End-to-end tests

One command walks through the whole site in a real browser:

```bash
npm run test:e2e          # build, start on port 3010, run every check
npm run test:e2e:report   # open the HTML report of the last run
```

It covers:

- the public pages and menu
- booking with an account, including private events
- the booking API
- the profile
- login, Google sign-in and roles
- every admin feature
- the booking and cancellation emails
- phone layouts

Each check is a named step, and a failing step is reported without stopping the rest.

## What it needs

- **A Neon test branch**, never the live database. Put its pooled connection string in `.env.test.local`, which git ignores:

  ```bash
  neon branches create --name test-e2e
  neon connection-string test-e2e --pooled
  # .env.test.local
  TEST_DATABASE_URL=postgresql://…
  ```

  Branch it from the live database so it has the menu. Before every run the suite:
  - updates the branch's schema
  - deletes what earlier runs created (bookings, `@bar-05.test` accounts, log entries, closed days)
  - resets the opening hours
  - creates an owner account with a random password

  It refuses to start if `TEST_DATABASE_URL` points at the same database as `DATABASE_URL`.

- **The Gmail settings from `.env.local`** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`). The test bookings send real emails, and the suite then reads the inbox over IMAP with the same App Password to check they arrived:
  - 6 booking emails and 1 cancellation per run
  - each subject contains `[TEST xxxxxx]`, with a new code every run
  - set `TEST_NOTIFY_EMAIL` to send them to a different inbox

- **Playwright's Chromium**: `npx playwright install chromium` once.

The test build goes into `.next-e2e/`, so it never replaces the normal `.next/` build.
