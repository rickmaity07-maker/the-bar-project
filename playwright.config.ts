import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/*
  End-to-end suite: builds the site, runs it against a Neon test branch and
  walks through every feature in a real browser. See e2e/README.md.
*/
for (const file of [".env.test.local", ".env.local"]) {
  // Earlier files win: loadEnvFile never overwrites a variable that is already set.
  if (existsSync(file)) process.loadEnvFile(file);
}

export const PORT = 3010;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One walkthrough that builds on its own state, so no parallel workers.
  workers: 1,
  timeout: 20 * 60 * 1000,
  expect: { timeout: 15_000 },
  reporter: [["list", { printSteps: true }], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx next build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 5 * 60 * 1000,
    reuseExistingServer: false,
    stdout: "pipe",
    env: {
      // The test branch, never the live database (global-setup refuses if they match).
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      // Separate build folder, so a test build never replaces the normal one.
      NEXT_DIST_DIR: ".next-e2e",
      GMAIL_FROM_NAME: "Bar-05 TEST",
      RESERVATION_NOTIFY_EMAIL: process.env.TEST_NOTIFY_EMAIL ?? process.env.GMAIL_USER ?? "",
    },
  },
});
