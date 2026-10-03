import { execSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { STATE_FILE, type SuiteState } from "./state";

/*
  Runs once before the suite: brings the test branch's schema up to date,
  removes everything a previous run created, and makes a fresh owner account
  with a random password. The live database is never touched.
*/

export default async function globalSetup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is missing. See e2e/README.md.");
  // Hard stop: tests create, change and delete data.
  if (process.env.DATABASE_URL && new URL(testUrl).host === new URL(process.env.DATABASE_URL).host) {
    throw new Error("TEST_DATABASE_URL points at the live database. Use a Neon test branch.");
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD are needed to send and check the test emails.");
  }

  const sql = neon(testUrl);
  const schema = readFileSync("db/schema.sql", "utf8").replace(/^\s*--.*$/gm, "");
  for (const statement of schema.split(";").map((s) => s.trim()).filter(Boolean)) await sql.query(statement);

  await sql`delete from reservations`;
  await sql`delete from users where email like '%@bar-05.test' or email like '%+e2e-%'`;
  await sql`delete from login_attempts`;
  await sql`delete from activity_log`;
  await sql`delete from closed_dates`;
  await sql`delete from menu_categories where name_de = 'Testkategorie'`;
  // The bar's real week: Monday and Tuesday closed, until three on Friday and Saturday.
  await sql`
    insert into opening_hours (weekday, closed, opens, closes) values
      (0, false, '18:00', '00:00'), (1, true, '18:00', '00:00'), (2, true, '18:00', '00:00'),
      (3, false, '18:00', '00:00'), (4, false, '18:00', '00:00'), (5, false, '18:00', '03:00'),
      (6, false, '18:00', '03:00')
    on conflict (weekday) do update set closed = excluded.closed, opens = excluded.opens, closes = excluded.closes
  `;
  // Bar details, nights and gallery start from the site's defaults every run.
  await sql`delete from venue`;
  await sql`delete from nights`;
  await sql`delete from gallery_photos`;
  execSync("npx tsx scripts/seed-content.mts", { env: { ...process.env, DATABASE_URL: testUrl }, stdio: "ignore" });

  const [{ count }] = (await sql`select count(*)::int as count from menu_items`) as { count: number }[];
  if (count === 0) throw new Error("The test branch has no menu. Branch it from the live database (e2e/README.md).");

  // On this branch only: the test owner must be the only owner, so the last-owner rules can be checked.
  await sql`update users set role = 'user' where email not like '%@bar-05.test'`;

  // A booking well past the retention period, for the clean-up check.
  await sql`
    insert into reservations (name, phone, email, date, time, guests, status)
    values ('Alte Reservierung', '0000 000000', '', current_date - interval '400 days', '20:00', 2, 'confirmed')
  `;

  const owner = { email: "e2e-owner@bar-05.test", password: randomBytes(12).toString("base64url") };
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt$${salt}$${scryptSync(owner.password, salt, 64).toString("hex")}`;
  await sql`
    insert into users (email, name, password_hash, role) values (${owner.email}, 'Test Inhaber', ${hash}, 'owner')
  `;

  const state: SuiteState = {
    run: randomBytes(3).toString("hex").toUpperCase(),
    owner,
    notifyEmail: process.env.TEST_NOTIFY_EMAIL ?? process.env.GMAIL_USER ?? "",
  };
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
