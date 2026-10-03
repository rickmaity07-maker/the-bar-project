import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { STATE_FILE, type SuiteState } from "./state";
import { waitForMail, type ReceivedMail } from "./inbox";

/*
  The whole site, end to end: public pages, booking with an account, the
  booking API, profile, login and roles, every admin feature, the emails
  (checked in the real Gmail inbox) and phone layouts. Each check is its own
  step; a failing step is reported but the walkthrough carries on.
*/
const state: SuiteState = JSON.parse(readFileSync(STATE_FILE, "utf8"));
const BASE = "http://localhost:3010";
const OWNER = state.owner.email;
const OWNER_PW = state.owner.password;
const TAG = `[TEST ${state.run}]`;
/* "+" aliases of the notify inbox: Gmail delivers them to the same mailbox, so guest emails can be checked too. */
const alias = (name: string) => state.notifyEmail.replace("@", `+e2e-${name}@`);
const GUEST = alias("guest");
const BEN = alias("ben");

type Outcome = boolean | void | { ok: unknown; extra?: unknown };
const settle = (page: Page, ms = 1800) => page.waitForTimeout(ms);

test("Bar-05: the whole site, end to end", async ({ browser }) => {
  let section = "";
  const check = (name: string, fn: () => Promise<Outcome>) =>
    test.step(`${section} › ${name}`, async () => {
      let out: Outcome;
      try {
        out = await fn();
      } catch (error) {
        out = { ok: false, extra: `threw: ${String((error as Error).message).split("\n")[0]}` };
      }
      const ok = out === undefined || out === true ? true : out === false ? false : Boolean(out.ok);
      const extra = out && typeof out === "object" && out.extra ? ` (${String(out.extra).slice(0, 160)})` : "";
      expect.soft(ok, `${section} › ${name}${extra}`).toBe(true);
    });

  const guestCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await guestCtx.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
  page.on("dialog", (d) => d.accept());

  /* ================= PUBLIC SITE ================= */
  section = "Public site";
  await check("Homepage loads with the Bar-05 title", async () => {
    const res = await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
    return { ok: res?.status() === 200 && (await page.title()).startsWith("Bar-05"), extra: await page.title() };
  });
  await check("Every nav link has a matching section", async () => {
    const hrefs = await page.locator("header nav ul a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const missing = [];
    for (const h of [...hrefs, "#reserve", "#top"]) if (!h || !(await page.locator(h).count())) missing.push(String(h));
    return { ok: hrefs.length === 4 && missing.length === 0, extra: missing.length ? `missing ${missing}` : hrefs.join(" ") };
  });
  await check("Menu: 7 tabs with the right number of drinks", async () => {
    const expected = { "Flaschen-Cocktails": 9, Gespritzte: 10, Shots: 8, Bier: 7, "Wein & Aperitif": 4, Softdrinks: 8, Pakete: 9 };
    const wrong = [];
    for (const [tab, count] of Object.entries(expected)) {
      await page.getByRole("tab", { name: tab }).click();
      await settle(page, 700);
      const n = await page.locator("#pour-panel li").count();
      if (n !== count) wrong.push(`${tab}=${n}`);
    }
    await page.getByRole("tab", { name: "Flaschen-Cocktails" }).click();
    return { ok: wrong.length === 0, extra: wrong.join(", ") || "9/10/8/7/4/8/9" };
  });
  await check("Allergen notice under the menu", async () =>
    (await page.locator("#pour-panel").innerText()).includes("Zusatzstoffen und Allergenen"));
  await check("Opening hours grouped correctly", async () => {
    const t = (await page.locator("#visit dl").innerText()).replace(/\s+/g, " ");
    return { ok: /MONTAG, DIENSTAG Geschlossen/i.test(t) && /FREITAG, SAMSTAG 18:00 bis 03:00/i.test(t), extra: t };
  });
  await check("Address, Maps link and phone link", async () => {
    const maps = await page.locator('#visit a[href*="google.com/maps"]').getAttribute("href");
    const tel = await page.locator('footer a[href^="tel:"]').getAttribute("href");
    return { ok: Boolean(maps?.includes("Kornmarkt+7")) && tel === "tel:+4917670220501", extra: tel };
  });
  await check("Footer: contact name, hours and credit", async () => {
    const t = await page.locator("footer").first().innerText();
    return t.includes("Eray Cadiroglu") && t.includes("0176 70220501") && t.includes("Freitag, Samstag: 18:00 bis 03:00");
  });
  await check("Nights section has 4 cards", async () => ({ ok: (await page.locator(".night-card").count()) === 4 }));
  await check("Kukki card with the four facts", async () => (await page.locator("#visit").innerText()).includes("ECHTES EIS"));
  await check("English switch translates and is remembered after reload", async () => {
    await page.locator('button[lang="en"]').first().click();
    await settle(page, 600);
    const tab = await page.getByRole("tab", { name: "Bottled cocktails" }).count();
    await page.reload({ waitUntil: "networkidle" });
    const still = await page.getByRole("tab", { name: "Bottled cocktails" }).count();
    await page.locator('button[lang="de"]').first().click();
    await settle(page, 600);
    return { ok: tab === 1 && still === 1, extra: `tab=${tab} afterReload=${still}` };
  });
  await check("Share image and icon are served", async () => {
    const og = await fetch(`${BASE}/opengraph-image`);
    const icon = await fetch(`${BASE}/icon.svg`);
    return { ok: og.status === 200 && Boolean(og.headers.get("content-type")?.includes("image/png")) && icon.status === 200, extra: `${og.status}/${icon.status}` };
  });
  await check("Privacy page is linked in the footer and complete", async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    const href = await page.locator('footer a[href="/datenschutz"]').getAttribute("href");
    const res = await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    const t = await page.locator("main").innerText();
    const need = ["Verantwortlich", "Kornmarkt 7", "Vercel", "Google", "Gmail", "Neon", "Frankfurt am Main", "Wie lange wir Daten speichern", "6 Monate", "bar05-locale", "§ 25 Abs. 2", "Eure Rechte", "Aufsichtsbehörde"];
    const missing = need.filter((x) => !t.includes(x));
    return { ok: res?.status() === 200 && (await page.title()).startsWith("Datenschutz") && missing.length === 0, extra: missing.join(",") || "all sections" };
  });
  await check("Login page links Google above the email form", async () => {
    await page.goto(`${BASE}/login`);
    const google = await page.getByRole("link", { name: "Mit Google anmelden" }).boundingBox();
    const email = await page.locator('input[name="email"]').boundingBox();
    return { ok: Boolean(google && email && google.y < email.y) };
  });
  await check("Unknown page returns 404", async () => ({ ok: (await fetch(`${BASE}/gibt-es-nicht`)).status === 404 }));

  /* ================= DATA PROTECTION ================= */
  section = "Data protection";
  await check("Browser contacts no third party (photos, fonts, scripts all from this site)", async () => {
    const probe = await guestCtx.newPage();
    const foreign = new Set<string>();
    probe.on("request", (r) => {
      const host = new URL(r.url()).host;
      if (host !== new URL(BASE).host) foreign.add(host);
    });
    for (const path of ["/", "/login", "/datenschutz"]) {
      await probe.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      for (let y = 0; y < 24_000; y += 1500) {
        await probe.mouse.wheel(0, 1500);
        await probe.waitForTimeout(100);
      }
      await probe.waitForLoadState("networkidle");
    }
    const photos = await probe.locator("img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).currentSrc).filter(Boolean).length);
    await probe.close();
    return { ok: foreign.size === 0, extra: foreign.size ? [...foreign].join(", ") : `none; ${photos} images served locally` };
  });
  await check("No cookies or storage before signing in", async () => {
    const fresh = await browser.newContext();
    const p = await fresh.newPage();
    await p.goto(BASE, { waitUntil: "networkidle" });
    const cookies = (await fresh.cookies()).length;
    const storage = await p.evaluate(() => localStorage.length);
    await fresh.close();
    return { ok: cookies === 0 && storage === 0, extra: `${cookies} cookies, ${storage} storage keys` };
  });
  await check("Security headers on every page", async () => {
    const r = await fetch(`${BASE}/login`);
    const h = (k: string) => r.headers.get(k) ?? "";
    const ok = h("x-content-type-options") === "nosniff" && h("x-frame-options") === "DENY" &&
      h("referrer-policy") === "strict-origin-when-cross-origin" && h("content-security-policy").includes("frame-ancestors 'none'") &&
      h("permissions-policy").includes("camera=()");
    return { ok, extra: ok ? "nosniff, DENY, referrer, CSP, permissions" : JSON.stringify(Object.fromEntries(r.headers)) };
  });
  await check("Clean-up job refuses calls without the secret", async () => {
    const none = await fetch(`${BASE}/api/cron/cleanup`);
    const wrong = await fetch(`${BASE}/api/cron/cleanup`, { headers: { authorization: "Bearer falsch" } });
    return { ok: none.status === 401 && wrong.status === 401, extra: `${none.status}/${wrong.status}` };
  });
  await check("Clean-up job deletes bookings past the 6-month limit", async () => {
    const r = await fetch(`${BASE}/api/cron/cleanup`, { headers: { authorization: `Bearer ${process.env.E2E_CRON_SECRET}` } });
    const body = await r.json();
    return { ok: r.status === 200 && body.deleted?.reservations === 1, extra: JSON.stringify(body.deleted) };
  });

  /* ================= BOOKING NEEDS AN ACCOUNT ================= */
  section = "Booking gate & sign-up";
  const GUEST_PW = "gast-passwort-1";
  const form = async () => {
    await page.goto(`${BASE}/#reserve`, { waitUntil: "networkidle" });
    await page.locator("#reserve").scrollIntoViewIfNeeded();
    await settle(page, 1200);
  };
  const navText = async (p: Page) => (await p.locator("header nav").innerText()).toUpperCase();
  await check("Signed out: nav offers 'Anmelden', no admin link", async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page, 800);
    const t = await navText(page);
    return { ok: t.includes("ANMELDEN") && !t.includes("VERWALTUNG") && !t.includes("PROFIL"), extra: t.replace(/\s+/g, " ") };
  });
  await check("Signed out: booking section asks to sign in instead of showing the form", async () => {
    await form();
    const t = await page.locator("#reserve").innerText();
    return { ok: t.includes("Erst anmelden") && !(await page.locator("#name").count()), extra: t.slice(-120).replace(/\s+/g, " ") };
  });
  await check("Signed out: booking API answers 401", async () => {
    const r = await fetch(`${BASE}/api/reserve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Anon", phone: "0171 0000000", date: "2026-10-07", time: "19:00", guests: "2" }) });
    return { ok: r.status === 401, extra: r.status };
  });
  await check("'Konto erstellen' opens sign-up with a note about the booking", async () => {
    await page.locator("#reserve").getByRole("link", { name: "Konto erstellen" }).click();
    await page.waitForURL(/\/login\?/, { timeout: 15000 });
    const signupTab = await page.getByRole("tab", { name: "Registrieren" }).getAttribute("aria-selected");
    return { ok: signupTab === "true" && (await page.getByText("zurück zur Reservierung").count()) === 1, extra: page.url() };
  });
  await check("Sign-up form says what is stored and links the privacy policy", async () => {
    const note = page.getByText("Für das Konto speichern wir E-Mail, Name");
    return { ok: (await note.count()) === 1 && (await page.locator('form a[href="/datenschutz"]').count()) === 1 };
  });
  await check("Sign-up returns straight to the booking form", async () => {
    await page.fill('input[name="name"]', "Gast Konto");
    await page.fill('input[name="email"]', GUEST);
    await page.fill('input[name="password"]', GUEST_PW);
    await page.getByRole("button", { name: "Konto erstellen" }).click();
    await page.waitForURL(`${BASE}/#reserve`, { timeout: 20000 });
    await settle(page, 1500);
    const t = await page.locator("#reserve").innerText();
    return { ok: t.includes(`Angemeldet als ${GUEST}`) && (await page.inputValue("#name")) === "Gast Konto", extra: t.slice(0, 80).replace(/\s+/g, " ") };
  });
  await check("Signed in as a guest: nav shows 'Profil' but no admin link", async () => {
    const t = await navText(page);
    return { ok: t.includes("PROFIL") && !t.includes("VERWALTUNG"), extra: t.replace(/\s+/g, " ") };
  });

  /* ================= RESERVATION FORM ================= */
  section = "Reservation form";
  const errorsShown = () => page.locator('#reserve [id$="-error"]').allInnerTexts();
  await form();
  await check("Booking form links the privacy policy", async () =>
    (await page.locator('#reserve a[href="/datenschutz"]').count()) === 1);
  await check("Cleared form shows name, phone, date and time errors", async () => {
    await page.fill("#name", "");
    await page.getByRole("button", { name: "Tisch anfragen" }).click();
    const e = await errorsShown();
    return { ok: e.length === 4, extra: e.length + " errors" };
  });
  await check("Past date rejected", async () => {
    await page.fill("#date", "2026-09-30");
    await page.getByRole("button", { name: "Tisch anfragen" }).click();
    return (await page.locator("#date-error").innerText()).includes("Vergangenheit");
  });
  await check("Monday rejected as closed", async () => {
    await page.fill("#date", "2026-10-12");
    await page.getByRole("button", { name: "Tisch anfragen" }).click();
    return (await page.locator("#date-error").innerText()).includes("geschlossen");
  });
  await check("Table booking for 4 succeeds", async () => {
    await page.fill("#name", `Anna Tisch ${TAG}`);
    await page.fill("#phone", "0171 1111111");
    await page.fill("#date", "2026-10-07");
    await page.fill("#time", "19:30");
    await page.selectOption("#guests", "4");
    await page.getByRole("button", { name: "Tisch anfragen" }).click();
    await page.getByText("Anfrage erhalten.").waitFor({ timeout: 20000 });
    const t = await page.locator("#reserve").innerText();
    return { ok: t.includes("Anna Tisch") && t.includes("für 4 um 19:30"), extra: t.split("\n").slice(-3).join(" ") };
  });
  await check("'Weiteren Tisch anfragen' resets to the account's details", async () => {
    await page.getByRole("button", { name: "Weiteren Tisch anfragen" }).click();
    return { ok: (await page.inputValue("#name")) === "Gast Konto" && (await page.inputValue("#date")) === "" && (await page.inputValue("#guests")) === "2", extra: await page.inputValue("#name") };
  });
  await check("Private checkbox swaps in the event fields, email pre-filled", async () => {
    await page.locator('input[name="isPrivate"]').check();
    for (const id of ["#endTime", "#occasion", "#email", "#message"]) if (!(await page.locator(id).count())) return { ok: false, extra: `${id} missing` };
    return { ok: (await page.inputValue("#guests")) === "" && (await page.inputValue("#email")) === GUEST };
  });
  await check("Private form validates occasion, end time, email and guest count", async () => {
    await page.fill("#name", `Ben Event ${TAG}`);
    await page.fill("#phone", "0171 2222222");
    await page.fill("#date", "2026-10-10");
    await page.fill("#time", "19:00");
    await page.fill("#guests", "600");
    await page.fill("#email", "kein-email");
    await page.getByRole("button", { name: "Bar anfragen" }).click();
    const e = (await errorsShown()).join(" | ");
    return { ok: ["Anlass", "endet", "E-Mail", "500"].every((s) => e.includes(s)), extra: e };
  });
  await check("Private event booking succeeds", async () => {
    await page.fill("#guests", "80");
    await page.fill("#endTime", "02:00");
    await page.selectOption("#occasion", "company");
    await page.fill("#email", BEN);
    await page.fill("#message", "Firmenfeier mit DJ <script>alert(1)</script>");
    await page.getByRole("button", { name: "Bar anfragen" }).click();
    await page.getByText("Anfrage erhalten.").waitFor({ timeout: 20000 });
    return (await page.locator("#reserve").innerText()).includes("Angebot");
  });
  await check("Unticking private returns to the 1-12 guest list", async () => {
    await page.getByRole("button", { name: "Weiteren Tisch anfragen" }).click();
    await page.locator('input[name="isPrivate"]').check();
    await page.locator('input[name="isPrivate"]').uncheck();
    return (await page.locator("#guests option").count()) === 12 && !(await page.locator("#occasion").count());
  });
  await check("Booking in English shows the English confirmation", async () => {
    await page.locator('button[lang="en"]').first().click();
    await settle(page, 600);
    await page.fill("#name", `Chris English ${TAG}`);
    await page.fill("#phone", "0171 3333333");
    await page.fill("#date", "2026-10-08");
    await page.fill("#time", "21:00");
    await page.getByRole("button", { name: "Request this table" }).click();
    await page.getByText("Request received.").waitFor({ timeout: 20000 });
    await page.locator('button[lang="de"]').first().click();
    return true;
  });

  /* ================= API (signed in) ================= */
  section = "Booking API";
  const api = (body: unknown, raw?: string) =>
    page.request
      .post(`${BASE}/api/reserve`, { headers: { "Content-Type": "application/json" }, data: Buffer.from(raw ?? JSON.stringify(body)) })
      .then(async (r) => ({ status: r.status(), json: await r.json().catch(() => null) }));
  await check("Broken JSON gets 400", async () => ({ ok: (await api(null, "{nope")).status === 400 }));
  await check("Invalid booking gets 422 with field codes", async () => {
    const r = await api({ name: "x", phone: "1", date: "2026-10-12", time: "7pm", guests: "40" });
    const codes = r.json?.errors ?? {};
    return { ok: r.status === 422 && codes.name && codes.phone && codes.date === "closed" && codes.time && codes.guests, extra: JSON.stringify(codes) };
  });
  await check("Over-long private message rejected", async () => {
    const r = await api({ name: "Lang", phone: "0171 4444444", date: "2026-10-10", time: "19:00", guests: "30", isPrivate: true, occasion: "other", endTime: "01:00", email: "a@b.de", message: "x".repeat(1001) });
    return { ok: r.status === 422 && r.json.errors.message === "message", extra: JSON.stringify(r.json?.errors) };
  });
  await check("Event fields are ignored on a normal table booking", async () => {
    const r = await api({ name: `Dora Direkt ${TAG}`, phone: "0171 5555555", date: "2026-10-09", time: "18:30", guests: "3", isPrivate: false, occasion: "wedding", email: "dora@example.com", message: "soll ignoriert werden" });
    return { ok: r.status === 200 && r.json.ok, extra: r.status };
  });
  await check("GET on the booking endpoint is refused", async () => ({ ok: (await fetch(`${BASE}/api/reserve`)).status === 405 }));

  /* ================= PROFILE ================= */
  section = "Profile";
  await check("Profile lists the guest's 5 bookings", async () => {
    await api({ name: `Storno Test ${TAG}`, phone: "0171 9999999", date: "2026-10-15", time: "20:00", guests: "2" });
    await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    const t = await page.locator("main").innerText();
    const items = await page.locator("main li").count();
    return { ok: t.includes("Hallo, Gast Konto.") && items === 5 && /PRIVATE VERANSTALTUNG/i.test(t), extra: `${items} bookings` };
  });
  await check("First booking saved the phone number to the profile", async () => ({
    ok: (await page.locator('input[name="phone"]').inputValue()) === "0171 1111111",
    extra: await page.locator('input[name="phone"]').inputValue(),
  }));
  await check("Guest cancels their own booking", async () => {
    const item = page.locator("main li", { hasText: "15. Oktober 2026" });
    await item.getByRole("button", { name: "Stornieren" }).click();
    await settle(page, 2500);
    const t = await page.locator("main li", { hasText: "15. Oktober 2026" }).innerText();
    return { ok: t.includes("STORNIERT") && !(await page.locator("main li", { hasText: "15. Oktober 2026" }).getByRole("button", { name: "Stornieren" }).count()), extra: t.replace(/\s+/g, " ") };
  });
  await check("Changing name and phone", async () => {
    await page.locator('input[name="name"]').fill("Gast Geändert");
    await page.locator('input[name="phone"]').fill("0171 1212121");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.getByText("Gespeichert.").waitFor({ timeout: 15000 });
    await page.reload({ waitUntil: "networkidle" });
    return (await page.locator('input[name="phone"]').inputValue()) === "0171 1212121" && (await page.locator("h1").innerText()).includes("Gast Geändert");
  });
  await check("Invalid phone number refused", async () => {
    await page.locator('input[name="phone"]').fill("12");
    await page.getByRole("button", { name: "Speichern" }).click();
    await page.getByText("mindestens 6 Ziffern").waitFor({ timeout: 15000 });
    await page.reload();
    return true;
  });
  await check("Password change needs the current password", async () => {
    await page.locator('input[name="current"]').fill("falsch-falsch");
    await page.locator('input[name="password"]').fill("gast-passwort-2");
    await page.getByRole("button", { name: "Passwort ändern" }).click();
    await page.getByText("Das aktuelle Passwort stimmt nicht.").waitFor({ timeout: 15000 });
    await page.locator('input[name="current"]').fill(GUEST_PW);
    await page.locator('input[name="password"]').fill("gast-passwort-2");
    await page.getByRole("button", { name: "Passwort ändern" }).click();
    await page.getByText("Passwort geändert.").waitFor({ timeout: 15000 });
    return true;
  });
  await check("Guest profile has no admin link, and /admin sends them back", async () => {
    const link = await page.getByRole("link", { name: "Zur Verwaltung" }).count();
    await page.goto(`${BASE}/admin`);
    return { ok: link === 0 && page.url().endsWith("/profile"), extra: page.url() };
  });

  /* ================= LOGIN ================= */
  section = "Login & access";
  const anon = await (await browser.newContext()).newPage();
  await check("/admin and /profile redirect to /login when signed out", async () => {
    const bad = [];
    for (const p of ["/admin", "/admin/reservations", "/admin/menu", "/admin/hours", "/admin/users", "/admin/activity", "/profile"]) {
      await anon.goto(`${BASE}${p}`);
      if (!new URL(anon.url()).pathname.endsWith("/login")) bad.push(p);
    }
    return { ok: bad.length === 0, extra: bad.join(",") };
  });
  await check("Session cookie is httpOnly and SameSite=Lax", async () => {
    const c = (await guestCtx.cookies()).find((x) => x.name === "session");
    return { ok: c && c.httpOnly && c.sameSite === "Lax", extra: c ? `httpOnly=${c.httpOnly} sameSite=${c.sameSite}` : "no cookie" };
  });
  await check("Sign out goes to the homepage and ends the session", async () => {
    await page.goto(`${BASE}/profile`);
    await page.getByRole("button", { name: "Abmelden" }).click();
    await page.waitForURL(`${BASE}/`, { timeout: 15000 });
    await settle(page, 1200);
    return { ok: !(await guestCtx.cookies()).some((x) => x.name === "session") && (await navText(page)).includes("ANMELDEN") };
  });
  await check("Sign-up with an existing email is refused", async () => {
    await page.goto(`${BASE}/login?mode=signup`);
    await page.fill('input[name="email"]', OWNER);
    await page.fill('input[name="password"]', "irgendwas-langes");
    await page.getByRole("button", { name: "Konto erstellen" }).click();
    await page.getByText("Für diese E-Mail gibt es schon ein Konto.").waitFor({ timeout: 15000 });
    return true;
  });
  await check("Old password no longer works, new one leads to the profile", async () => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', GUEST);
    await page.fill('input[name="password"]', GUEST_PW);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await page.getByText("E-Mail oder Passwort stimmen nicht.").waitFor({ timeout: 15000 });
    await page.fill('input[name="password"]', "gast-passwort-2");
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await page.waitForURL(`${BASE}/profile`, { timeout: 15000 });
    return true;
  });
  await check("After 8 wrong passwords even the right one is blocked for 15 minutes", async () => {
    await anon.goto(`${BASE}/login`);
    await anon.fill('input[name="email"]', "niemand@bar-05.test");
    for (let i = 0; i < 8; i++) {
      await anon.fill('input[name="password"]', `falsch-${i}-xyz`);
      await anon.getByRole("button", { name: "Anmelden", exact: true }).click();
      await settle(anon, 900);
    }
    await anon.fill('input[name="password"]', "egal-was");
    await anon.getByRole("button", { name: "Anmelden", exact: true }).click();
    await anon.getByText("Zu viele Versuche").waitFor({ timeout: 15000 });
    return true;
  });
  await check("Google button sends to Google with PKCE and the right return address", async () => {
    await anon.goto(`${BASE}/login?next=%2F%23reserve`);
    const link = anon.getByRole("link", { name: "Mit Google anmelden" });
    const href = await link.getAttribute("href");
    const r = await anon.request.get(`${BASE}${href}`, { maxRedirects: 0 });
    const target = new URL(r.headers().location);
    const p = target.searchParams;
    const cookie = r.headers()["set-cookie"] || "";
    const ok = target.host === "accounts.google.com" && Boolean(process.env.GOOGLE_CLIENT_ID) && p.get("client_id") === process.env.GOOGLE_CLIENT_ID &&
      p.get("redirect_uri") === `${BASE}/api/auth/google/callback` && p.get("code_challenge_method") === "S256" &&
      p.get("scope") === "openid email profile" && p.get("state") && cookie.includes("google_oauth") && cookie.toLowerCase().includes("httponly");
    return { ok, extra: `${r.status()} ${target.host}` };
  });
  await check("Google callback with a forged state is rejected", async () => {
    await anon.goto(`${BASE}/api/auth/google/callback?code=fake&state=forged`);
    return { ok: anon.url().includes("/login?error=google") && (await anon.getByText("Die Anmeldung mit Google hat nicht geklappt.").count()) === 1, extra: anon.url() };
  });

  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const admin = await ownerCtx.newPage();
  admin.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
  admin.on("dialog", (d) => d.accept());
  await check("Owner signs in and lands in /admin", async () => {
    await admin.goto(`${BASE}/login`);
    await admin.fill('input[name="email"]', OWNER);
    await admin.fill('input[name="password"]', OWNER_PW);
    await admin.getByRole("button", { name: "Anmelden", exact: true }).click();
    await admin.waitForURL(`${BASE}/admin`, { timeout: 20000 });
    return true;
  });
  await check("Owner sees 'Verwaltung' in the site nav and on the profile", async () => {
    await admin.goto(BASE, { waitUntil: "networkidle" });
    await settle(admin, 1000);
    const t = await navText(admin);
    await admin.goto(`${BASE}/profile`);
    const link = await admin.getByRole("link", { name: "Zur Verwaltung" }).count();
    return { ok: t.includes("VERWALTUNG") && t.includes("PROFIL") && link === 1, extra: t.replace(/\s+/g, " ") };
  });
  await admin.goto(`${BASE}/admin`);

  /* ================= ADMIN: OVERVIEW + RESERVATIONS ================= */
  section = "Admin: reservations";
  await check("Overview counts 4 open requests and 1 private event", async () => {
    const tile = async (label: string) => (await admin.locator(`a:has-text("${label}") p.display`).innerText()).trim();
    const open = await tile("Offene Anfragen");
    const priv = await tile("Private Events geplant");
    return { ok: open === "4" && priv === "1", extra: `open=${open} private=${priv}` };
  });
  await check("Private card shows occasion, end time, email, message (escaped)", async () => {
    await admin.goto(`${BASE}/admin/reservations?type=private`);
    const t = await admin.locator("article").first().innerText();
    return { ok: (await admin.locator("article").count()) === 1 && t.includes("Firmenfeier") && t.includes("bis 02:00") && t.includes(BEN) && t.includes("<script>") && t.includes("KONTO") && t.includes(GUEST), extra: t.slice(0, 90).replace(/\s+/g, " ") };
  });
  await check("Event fields were dropped from the plain API booking", async () => {
    await admin.goto(`${BASE}/admin/reservations?q=Dora`);
    const t = await admin.locator("article").first().innerText();
    return { ok: !t.includes("dora@example.com") && !t.includes("ignoriert") && !t.includes("ANLASS"), extra: t.slice(0, 80).replace(/\s+/g, " ") };
  });
  await check("English booking is marked as English", async () =>
    (await (await admin.goto(`${BASE}/admin/reservations?q=Chris`), admin.locator("article").first().innerText())).includes("Englisch"));
  await check("Search by phone number", async () => {
    await admin.goto(`${BASE}/admin/reservations?q=1111111`);
    return (await admin.locator("article").count()) === 1;
  });
  await check("Filters: 'Vergangen' empty, 'Nur Tische' shows 4, 'Storniert' shows the guest's cancellation", async () => {
    await admin.goto(`${BASE}/admin/reservations?when=past`);
    const past = await admin.locator("article").count();
    await admin.goto(`${BASE}/admin/reservations?type=table`);
    const tables = await admin.locator("article").count();
    await admin.goto(`${BASE}/admin/reservations?status=cancelled`);
    const cancelled = await admin.locator("article", { hasText: "Storno Test" }).count();
    return { ok: past === 0 && tables === 4 && cancelled === 1, extra: `past=${past} tables=${tables} cancelled=${cancelled}` };
  });
  const anna = () => admin.locator("article", { hasText: "Anna Tisch" });
  const status = async () => (await anna().locator("span.label").first().innerText()).trim();
  await check("Status flow: confirm, cancel, reopen, decline", async () => {
    await admin.goto(`${BASE}/admin/reservations`);
    const seen = [];
    for (const button of ["Bestätigen", "Stornieren", "Wieder öffnen", "Ablehnen"]) {
      await anna().getByRole("button", { name: button }).click();
      await settle(admin);
      seen.push(await status());
    }
    return { ok: seen.join(",") === "BESTÄTIGT,STORNIERT,OFFEN,ABGELEHNT", extra: seen.join(",") };
  });
  await check("Internal note is saved", async () => {
    await anna().locator('input[name="note"]').fill("Stammgast, Fensterplatz");
    await anna().getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await admin.reload();
    return (await anna().locator('input[name="note"]').inputValue()) === "Stammgast, Fensterplatz";
  });
  await check("Confirmed bookings count on the overview", async () => {
    await admin.goto(`${BASE}/admin/reservations?q=Chris`);
    await admin.locator("article").first().getByRole("button", { name: "Bestätigen" }).click();
    await settle(admin);
    await admin.goto(`${BASE}/admin`);
    return (await admin.getByText("Als Nächstes").locator("xpath=../..").innerText()).includes("Chris English");
  });
  await check("Delete removes a booking", async () => {
    await admin.goto(`${BASE}/admin/reservations?q=Dora`);
    await admin.locator("article").first().getByRole("button", { name: "Löschen" }).click();
    await settle(admin);
    await admin.reload();
    return (await admin.locator("article").count()) === 0;
  });

  /* ================= ADMIN: MENU ================= */
  section = "Admin: menu";
  const homeTabs = async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    return page.locator('[role="tab"]').allInnerTexts();
  };
  await check("Menu page lists 7 categories and 55 drinks", async () => {
    await admin.goto(`${BASE}/admin/menu`);
    return (await admin.getByText("7 Kategorien · 55 Getränke").count()) === 1;
  });
  await check("New empty category stays off the website", async () => {
    const add = admin.locator("section", { hasText: "Neue Kategorie" });
    await add.locator('input[name="name_de"]').fill("Testkategorie");
    await add.locator('input[name="name_en"]').fill("Test category");
    await add.getByRole("button", { name: "Kategorie anlegen" }).click();
    await settle(admin);
    const inAdmin = await admin.locator('input[name="name_de"][value="Testkategorie"]').count();
    const tabs = await homeTabs();
    return { ok: inAdmin === 1 && tabs.length === 7, extra: `tabs=${tabs.length}` };
  });
  const testCat = () => admin.locator('section:has(input[name="name_de"][value="Testkategorie"])');
  await check("Adding a drink puts the category and drink on the website", async () => {
    const add = testCat().locator("form", { has: admin.locator('input[placeholder="Neues Getränk (Deutsch)"]') });
    await add.locator('input[name="name_de"]').fill("Testdrink");
    await add.locator('input[name="name_en"]').fill("Test drink");
    await add.locator('input[name="price"]').fill("9,99");
    await add.getByRole("button", { name: "Hinzufügen" }).click();
    await settle(admin);
    const tabs = await homeTabs();
    await page.getByRole("tab", { name: "TESTKATEGORIE" }).click().catch(() => page.getByRole("tab", { name: "Testkategorie" }).click());
    await settle(page, 700);
    const row = await page.locator("#pour-panel li").first().innerText();
    return { ok: tabs.length === 8 && row.includes("Testdrink") && row.includes("9,99"), extra: `${tabs.length} tabs; ${row.replace(/\s+/g, " ")}` };
  });
  await check("Editing a price updates the website", async () => {
    await admin.goto(`${BASE}/admin/menu`);
    const item = admin.locator('form:has(input[name="name_de"][value="Testdrink"])');
    await item.locator('input[name="price"]').fill("11,50");
    await item.locator('input[name="note_de"]').fill("Nur zum Testen");
    await item.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "Testkategorie" }).click();
    await settle(page, 700);
    const row = await page.locator("#pour-panel li").first().innerText();
    return { ok: row.includes("11,50") && row.includes("Nur zum Testen"), extra: row.replace(/\s+/g, " ") };
  });
  await check("English name shows in English, German note as fallback", async () => {
    await page.locator('button[lang="en"]').first().click();
    await settle(page, 700);
    await page.getByRole("tab", { name: "Test category" }).click();
    await settle(page, 700);
    const row = await page.locator("#pour-panel li").first().innerText();
    await page.locator('button[lang="de"]').first().click();
    return { ok: row.includes("Test drink") && row.includes("Nur zum Testen"), extra: row.replace(/\s+/g, " ") };
  });
  await check("Hiding the only drink removes the category from the website", async () => {
    const item = admin.locator('form:has(input[name="name_de"][value="Testdrink"])');
    await item.locator('input[name="visible"]').uncheck();
    await item.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    const tabs = await homeTabs();
    return { ok: tabs.length === 7, extra: `tabs=${tabs.length}` };
  });
  await check("Reordering drinks changes the website order", async () => {
    await admin.goto(`${BASE}/admin/menu`);
    const caipi = admin.locator('li:has(input[name="name_de"][value="Caipi"])');
    await caipi.getByRole("button", { name: "↓" }).click();
    await settle(admin);
    await page.goto(BASE, { waitUntil: "networkidle" });
    const first = await page.locator("#pour-panel li").first().innerText();
    await admin.locator('li:has(input[name="name_de"][value="Caipi"])').getByRole("button", { name: "↑" }).click();
    await settle(admin);
    await page.goto(BASE, { waitUntil: "networkidle" });
    const back = await page.locator("#pour-panel li").first().innerText();
    return { ok: first.startsWith("Mojito") && back.startsWith("Caipi"), extra: `${first.split("\n")[0]} then ${back.split("\n")[0]}` };
  });
  await check("Reordering categories", async () => {
    const before = await admin.locator("summary span.display").allInnerTexts();
    const firstCategory = () => admin.locator("summary span.display").first().innerText();
    await admin.locator("section", { hasText: "Gespritzte" }).first().getByRole("button", { name: "↑" }).first().click();
    await expect.poll(firstCategory, { timeout: 15_000 }).toContain("Gespritzte");
    const after = await admin.locator("summary span.display").allInnerTexts();
    await admin.locator("section", { hasText: "Gespritzte" }).first().getByRole("button", { name: "↓" }).first().click();
    await expect.poll(firstCategory, { timeout: 15_000 }).toContain("Flaschen");
    return { ok: after[0].startsWith("Gespritzte") && before[0].startsWith("Flaschen"), extra: `${before[0]} -> ${after[0]}` };
  });
  await check("Renaming a category", async () => {
    const cat = testCat();
    await cat.locator('input[name="line_de"]').fill("Beschreibung geändert");
    await cat.getByRole("button", { name: "Kategorie speichern" }).click();
    await settle(admin);
    return (await testCat().locator('input[name="line_de"]').inputValue()) === "Beschreibung geändert";
  });
  await check("Deleting a drink and a category", async () => {
    await admin.locator('li:has(input[name="name_de"][value="Testdrink"])').getByRole("button", { name: "Löschen" }).click();
    await settle(admin);
    await testCat().getByRole("button", { name: "Löschen" }).first().click();
    await settle(admin);
    await admin.reload();
    return (await admin.getByText("7 Kategorien · 55 Getränke").count()) === 1;
  });

  /* ================= ADMIN: HOURS ================= */
  section = "Admin: hours";
  await check("Opening Tuesday shows on the website and allows bookings", async () => {
    await admin.goto(`${BASE}/admin/hours`);
    await admin.locator('input[name="closed_2"]').uncheck();
    await admin.locator('input[name="opens_2"]').fill("17:00");
    await admin.locator('input[name="closes_2"]').fill("23:00");
    await admin.getByRole("button", { name: "Wochenplan speichern" }).click();
    await settle(admin);
    await page.goto(BASE, { waitUntil: "networkidle" });
    const t = (await page.locator("#visit dl").innerText()).replace(/\s+/g, " ");
    const r = await api({ name: `Erika Dienstag ${TAG}`, phone: "0171 6666666", date: "2026-10-13", time: "18:00", guests: "2" });
    return { ok: /DIENSTAG 17:00 bis 23:00/i.test(t) && r.status === 200, extra: `${t} | api ${r.status}` };
  });
  await check("Closing Tuesday again blocks bookings", async () => {
    await admin.locator('input[name="closed_2"]').check();
    await admin.locator('input[name="opens_2"]').fill("18:00");
    await admin.locator('input[name="closes_2"]').fill("00:00");
    await admin.getByRole("button", { name: "Wochenplan speichern" }).click();
    await settle(admin);
    const r = await api({ name: `Erika Dienstag ${TAG}`, phone: "0171 6666666", date: "2026-10-20", time: "18:00", guests: "2" });
    return { ok: r.status === 422 && r.json.errors.date === "closed", extra: r.status };
  });
  await check("One-off closed day blocks bookings, removing it allows them", async () => {
    await admin.fill('input[name="date"]', "2026-10-16");
    await admin.fill('input[name="reason"]', "Betriebsausflug");
    await admin.getByRole("button", { name: "Eintragen" }).click();
    await admin.getByText("Betriebsausflug").waitFor({ timeout: 15000 });
    const blocked = await api({ name: "Fritz Freitag", phone: "0171 7777777", date: "2026-10-16", time: "20:00", guests: "2" });
    await admin.locator("li", { hasText: "Betriebsausflug" }).getByRole("button", { name: "Entfernen" }).click();
    await settle(admin);
    const gone = !(await admin.getByText("Betriebsausflug").count());
    return { ok: blocked.status === 422 && blocked.json.errors.date === "closed" && gone, extra: `blocked=${blocked.status} removed=${gone}` };
  });
  await check("Closed day also blocks in the browser form", async () => {
    await admin.fill('input[name="date"]', "2026-10-23");
    await admin.getByRole("button", { name: "Eintragen" }).click();
    await settle(admin);
    await form();
    await page.fill("#name", "Gina Form");
    await page.fill("#phone", "0171 8888888");
    await page.fill("#date", "2026-10-23");
    await page.fill("#time", "20:00");
    await page.getByRole("button", { name: "Tisch anfragen" }).click();
    const msg = await page.locator("#date-error").innerText();
    await admin.locator("li", { hasText: "Fr., 23.10.2026" }).getByRole("button", { name: "Entfernen" }).click();
    await settle(admin);
    return { ok: msg.includes("geschlossen"), extra: msg };
  });

  /* ================= ADMIN: BAR DETAILS, NIGHTS, GALLERY ================= */
  section = "Admin: content in the database";
  const home = async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page, 800);
  };
  await check("Bar & Kontakt: a new phone number shows in the footer, booking section and privacy policy", async () => {
    await admin.goto(`${BASE}/admin/venue`);
    const original = await admin.locator('input[name="phone"]').inputValue();
    await admin.locator('input[name="phone"]').fill("0171 0000005");
    await admin.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await home();
    const footer = await page.locator("footer").first().innerText();
    const tel = await page.locator('footer a[href^="tel:"]').getAttribute("href");
    const booking = await page.locator("#reserve").innerText();
    await page.goto(`${BASE}/datenschutz`);
    const privacy = await page.locator("main").innerText();
    await admin.goto(`${BASE}/admin/venue`);
    await admin.locator('input[name="phone"]').fill(original);
    await admin.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    const ok = footer.includes("0171 0000005") && tel === "tel:+491710000005" && booking.includes("0171 0000005") && privacy.includes("0171 0000005");
    return { ok, extra: `tel=${tel}` };
  });
  await check("Bar & Kontakt: the address shows in the visit section", async () => {
    await home();
    const visit = await page.locator("#visit").innerText();
    return { ok: visit.includes("Kornmarkt 7") && visit.includes("97421 Schweinfurt") };
  });
  await check("Abende: the 4 cards come from the database", async () => {
    await admin.goto(`${BASE}/admin/nights`);
    const inAdmin = await admin.getByText("4 Karten").count();
    await home();
    return { ok: inAdmin === 1 && (await page.locator(".night-card").count()) === 4 };
  });
  await check("Abende: editing a title shows on the website, hiding removes the card", async () => {
    await admin.goto(`${BASE}/admin/nights`);
    const first = admin.locator("section").filter({ has: admin.locator('input[name="title_de"]') }).first();
    const title = await first.locator('input[name="title_de"]').inputValue();
    await first.locator('input[name="title_de"]').fill("Testabend mit DJ");
    await first.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await home();
    const shown = (await page.locator("#nights").innerText()).includes("Testabend mit DJ");
    await admin.goto(`${BASE}/admin/nights`);
    const again = admin.locator("section").filter({ has: admin.locator('input[name="title_de"]') }).first();
    await again.locator('input[name="visible"]').uncheck();
    await again.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await home();
    const hidden = await page.locator(".night-card").count();
    await admin.goto(`${BASE}/admin/nights`);
    const restore = admin.locator("section").filter({ has: admin.locator('input[name="title_de"]') }).first();
    await restore.locator('input[name="title_de"]').fill(title);
    await restore.locator('input[name="visible"]').check();
    await restore.getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await home();
    const back = await page.locator(".night-card").count();
    return { ok: shown && hidden === 3 && back === 4, extra: `shown=${shown} hidden=${hidden} back=${back}` };
  });
  await check("Abende: adding and deleting a night", async () => {
    await admin.goto(`${BASE}/admin/nights`);
    const add = admin.locator("section", { hasText: "Neuer Abend" });
    await add.locator('input[name="day_de"]').fill("Montag");
    await add.locator('input[name="title_de"]').fill("Sonderabend");
    await add.getByRole("button", { name: "Abend anlegen" }).click();
    await settle(admin);
    await home();
    const added = await page.locator(".night-card").count();
    await admin.goto(`${BASE}/admin/nights`);
    await admin.locator("section", { hasText: "Montag · Sonderabend" }).getByRole("button", { name: "Löschen" }).click();
    await settle(admin);
    await home();
    return { ok: added === 5 && (await page.locator(".night-card").count()) === 4, extra: `added=${added}` };
  });
  await check("Galerie: hiding, adding, reordering and removing photos", async () => {
    await home();
    const start = await page.locator("figure.drift-item").count();
    const firstBefore = await page.locator("figure.drift-item img").first().getAttribute("alt");
    await admin.goto(`${BASE}/admin/gallery`);
    const first = () => admin.locator("section").filter({ has: admin.locator('select[name="ratio"]') }).first();
    await first().locator('input[name="visible"]').uncheck();
    await first().getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await home();
    const hidden = await page.locator("figure.drift-item").count();
    await admin.goto(`${BASE}/admin/gallery`);
    await first().locator('input[name="visible"]').check();
    await first().getByRole("button", { name: "Speichern" }).click();
    await settle(admin);
    await first().getByRole("button", { name: "↓" }).click();
    await settle(admin);
    await home();
    const firstAfter = await page.locator("figure.drift-item img").first().getAttribute("alt");
    await admin.goto(`${BASE}/admin/gallery`);
    await admin.locator("section").filter({ has: admin.locator('select[name="ratio"]') }).nth(1).getByRole("button", { name: "↑" }).click();
    await settle(admin);
    const add = admin.locator("section", { hasText: "Foto hinzufügen" });
    await add.locator('input[name="alt_de"]').fill("Testfoto");
    await add.getByRole("button", { name: "Hinzufügen" }).click();
    await settle(admin);
    await home();
    const added = await page.locator("figure.drift-item").count();
    await admin.goto(`${BASE}/admin/gallery`);
    await admin.locator("section").filter({ has: admin.locator('input[name="alt_de"][value="Testfoto"]') }).getByRole("button", { name: "Entfernen" }).click();
    await settle(admin);
    await home();
    const end = await page.locator("figure.drift-item").count();
    const ok = start === 6 && hidden === 5 && firstAfter !== firstBefore && added === 7 && end === 6;
    return { ok, extra: `start=${start} hidden=${hidden} reordered=${firstAfter !== firstBefore} added=${added} end=${end}` };
  });

  /* ================= ADMIN: USERS ================= */
  section = "Admin: users & roles";
  const staffCtx = await browser.newContext();
  const staff = await staffCtx.newPage();
  const staffLogin = async (pw: string) => {
    await staff.goto(`${BASE}/login`);
    await staff.fill('input[name="email"]', "kollege@bar-05.test");
    await staff.fill('input[name="password"]', pw);
    await staff.getByRole("button", { name: "Anmelden", exact: true }).click();
    await settle(staff, 2500);
  };
  const staffPanel = () => admin.locator("section", { hasText: "kollege@bar-05.test" });
  await check("Owner creates an account", async () => {
    await admin.goto(`${BASE}/admin/users`);
    const add = admin.locator("section", { hasText: "Konto anlegen" });
    await add.locator('input[name="email"]').fill("kollege@bar-05.test");
    await add.locator('input[name="name"]').fill("Kollege");
    await add.locator('input[name="password"]').fill("kollege-start-1");
    await add.getByRole("button", { name: "Konto anlegen" }).click();
    await admin.waitForURL(/notice=created/, { timeout: 15000 });
    return (await staffPanel().count()) === 1;
  });
  await check("Duplicate account refused", async () => {
    const add = admin.locator("section", { hasText: "Konto anlegen" });
    await add.locator('input[name="email"]').fill("kollege@bar-05.test");
    await add.locator('input[name="password"]').fill("kollege-start-1");
    await add.getByRole("button", { name: "Konto anlegen" }).click();
    await admin.waitForURL(/notice=exists/, { timeout: 15000 });
    return true;
  });
  await check("New account cannot open /admin", async () => {
    await staffLogin("kollege-start-1");
    await staff.goto(`${BASE}/admin`);
    return { ok: staff.url().endsWith("/profile"), extra: staff.url() };
  });
  await check("Promoting to owner grants access immediately", async () => {
    await staffPanel().getByRole("button", { name: "Zum Inhaber machen" }).click();
    await admin.waitForURL(/notice=saved/, { timeout: 15000 });
    await staff.goto(`${BASE}/admin`);
    return staff.url().endsWith("/admin");
  });
  await check("Demoting removes access on the next click", async () => {
    await admin.goto(`${BASE}/admin/users`);
    await staffPanel().getByRole("button", { name: "Zum Nutzer herabstufen" }).click();
    await admin.waitForURL(/notice=saved/, { timeout: 15000 });
    await staff.goto(`${BASE}/admin/menu`);
    return { ok: staff.url().endsWith("/profile"), extra: staff.url() };
  });
  await check("Deactivating signs the account out and blocks login", async () => {
    await admin.goto(`${BASE}/admin/users`);
    await staffPanel().getByRole("button", { name: "Deaktivieren" }).click();
    await admin.waitForURL(/notice=saved/, { timeout: 15000 });
    await staff.goto(`${BASE}/profile`);
    const signedOut = new URL(staff.url()).pathname === "/login";
    await staffLogin("kollege-start-1");
    const refused = (await staff.getByText("E-Mail oder Passwort stimmen nicht.").count()) === 1;
    return { ok: signedOut && refused, extra: `signedOut=${signedOut} refused=${refused}` };
  });
  await check("Reactivating and resetting the password", async () => {
    await admin.goto(`${BASE}/admin/users`);
    await staffPanel().getByRole("button", { name: "Aktivieren" }).click();
    await admin.waitForURL(/notice=saved/, { timeout: 15000 });
    await staffPanel().locator('input[name="password"]').fill("neues-passwort-2");
    await staffPanel().getByRole("button", { name: "Setzen" }).click();
    await admin.waitForURL(/notice=password-reset/, { timeout: 15000 });
    await staffLogin("kollege-start-1");
    const oldFails = (await staff.getByText("E-Mail oder Passwort stimmen nicht.").count()) === 1;
    await staffLogin("neues-passwort-2");
    const newWorks = staff.url().endsWith("/profile");
    return { ok: oldFails && newWorks, extra: `oldFails=${oldFails} newWorks=${newWorks}` };
  });
  await check("Owner cannot demote or deactivate themself", async () => {
    await admin.goto(`${BASE}/admin/users`);
    const own = admin.locator("section", { hasText: OWNER });
    return (await own.getByRole("button", { name: /herabstufen|Deaktivieren/ }).count()) === 0;
  });

  /* ================= ADMIN: ACTIVITY ================= */
  section = "Admin: activity log";
  await check("Every kind of change is logged", async () => {
    await admin.goto(`${BASE}/admin/activity`);
    const t = await admin.locator("main ul").innerText();
    const need = ["Bar & Kontakt geändert", "Abend geändert", "Abend angelegt", "Abend gelöscht", "Galeriefoto geändert", "Galeriefoto verschoben", "Galeriefoto hinzugefügt", "Galeriefoto entfernt", "Profil geändert", "Reservierung bestätigt", "Reservierung storniert", "Reservierung abgelehnt", "Notiz gespeichert", "Reservierung gelöscht", "Kategorie angelegt", "Getränk angelegt", "Getränk geändert", "Getränk verschoben", "Kategorie gelöscht", "Öffnungszeiten geändert", "Schließtag eingetragen", "Schließtag entfernt", "Nutzer angelegt", "Rolle geändert", "Nutzer deaktiviert", "Passwort zurückgesetzt", "Konto registriert"];
    const missing = need.filter((s) => !t.includes(s));
    return { ok: missing.length === 0, extra: missing.join(", ") || `${need.length} kinds found` };
  });
  await check("Price change logged with old and new price", async () =>
    (await admin.locator("main ul").innerText()).includes("9,99 → 11,50"));
  await check("Area filter shows only that area", async () => {
    await admin.locator("main").getByRole("link", { name: "Karte", exact: true }).click();
    await settle(admin, 1000);
    const lines = await admin.locator("main ul li").allInnerTexts();
    const foreign = lines.filter((l) => /Reservierung|Nutzer|Öffnungszeiten/.test(l));
    return { ok: lines.length > 0 && foreign.length === 0, extra: `${lines.length} lines` };
  });

  /* ================= EMAIL ================= */
  section = "Booking emails";
  let mails: ReceivedMail[] = [];
  const subjects = (prefix: string) => mails.filter((m) => m.subject.startsWith(prefix));
  await check(`All 17 test emails arrived in the Gmail inbox (${state.notifyEmail})`, async () => {
    mails = await waitForMail(state.run, 17);
    return { ok: mails.length === 17, extra: `${mails.length} emails: ${[...new Set(mails.map((m) => m.subject.split(/[:–]/)[0].trim()))].join(", ")}` };
  });
  await check("Bar: one email per booking and one for the guest's cancellation", async () => {
    const news = subjects("Neue Reservierung").length + subjects("Private Veranstaltung angefragt").length;
    return { ok: news === 6 && subjects("Storniert").length === 1, extra: `${news} new, ${subjects("Storniert").length} cancelled` };
  });
  await check("Guest: a receipt for every booking, sent to the booking's address", async () => {
    const receipts = [...subjects("Anfrage erhalten"), ...subjects("Request received")];
    const ben = receipts.find((m) => m.subject.includes("Ben Event"));
    return { ok: receipts.length === 6 && ben?.to === BEN && receipts.filter((m) => m.to === GUEST).length === 5, extra: `${receipts.length} receipts` };
  });
  await check("Guest: confirmed, cancelled and declined emails for Anna", async () => {
    const anna = (prefix: string) => subjects(prefix).filter((m) => m.subject.includes("Anna Tisch")).length;
    const counts = [anna("Reservierung bestätigt"), anna("Reservierung storniert"), anna("Reservierung leider nicht möglich")];
    const declined = subjects("Reservierung leider nicht möglich")[0];
    return { ok: counts.every((n) => n === 1) && Boolean(declined?.source.includes("keinen Platz")), extra: counts.join("/") };
  });
  await check("Guest who booked in English gets the confirmation in English", async () => {
    const m = subjects("Booking confirmed").find((x) => x.subject.includes("Chris English"));
    return { ok: Boolean(m && m.source.includes("Your table is confirmed") && m.source.includes("View on your profile")), extra: m?.subject };
  });
  await check("Reopening a request sends the guest nothing", async () =>
    ({ ok: mails.filter((m) => m.subject.includes("Anna Tisch") && m.to === GUEST).length === 4, extra: "receipt, confirmed, cancelled, declined" }));
  await check("Private-event email: subject, details, Reply-To guest, script shown as text", async () => {
    const m = mails.find((x) => x.subject.startsWith("Private Veranstaltung angefragt"));
    if (!m) return { ok: false, extra: "not found" };
    const ok = m.replyTo === BEN && m.source.includes("Firmenfeier") && m.source.includes("80 Gäste") && m.source.includes("&#60;script&#62;");
    return { ok, extra: m.subject };
  });
  await check("Table email has date, time and guests", async () => {
    const m = mails.find((x) => x.subject.startsWith("Neue Reservierung: Anna Tisch"));
    return { ok: Boolean(m && m.subject.includes("07.10.2026 19:30, 4 Gäste") && m.source.includes("0171 1111111")), extra: m?.subject };
  });
  await check("Cancellation email names the guest and their account", async () => {
    const m = mails.find((x) => x.subject.startsWith("Storniert"));
    return { ok: Boolean(m && m.subject.includes("Storno Test") && m.source.includes(GUEST) && m.replyTo === GUEST), extra: m?.subject };
  });

  /* ================= DATA SUBJECT RIGHTS ================= */
  section = "Guest rights (DSGVO)";
  await check("'Meine Daten herunterladen' gives every stored detail as a file", async () => {
    await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Meine Daten herunterladen" }).click()]);
    const data = JSON.parse(readFileSync((await download.path())!, "utf8"));
    const ok = data.account?.email === GUEST && data.reservations?.length >= 4 && !JSON.stringify(data).includes("scrypt$") &&
      download.suggestedFilename() === "bar-05-meine-daten.json";
    return { ok, extra: `${data.reservations?.length} bookings, ${data.activity?.length} log entries, no password hash` };
  });
  await check("Data download needs a signed-in account", async () => ({ ok: (await fetch(`${BASE}/api/profile/export`)).status === 401 }));
  await check("Account deletion asks for the account's email", async () => {
    await page.locator('input[name="confirm"]').fill("falsch@example.com");
    await page.getByRole("button", { name: "Konto endgültig löschen" }).click();
    await page.getByText("Die E-Mail stimmt nicht").waitFor({ timeout: 15_000 });
    return true;
  });
  await check("'Konto löschen' removes the account, its bookings and its sign-in", async () => {
    await page.locator('input[name="confirm"]').fill(GUEST);
    await page.getByRole("button", { name: "Konto endgültig löschen" }).click();
    await page.waitForURL(/konto=geloescht/, { timeout: 20_000 });
    const signedOut = !(await guestCtx.cookies()).some((c) => c.name === "session");
    await admin.goto(`${BASE}/admin/reservations?when=all&q=${encodeURIComponent(TAG)}`);
    const left = await admin.locator("article").count();
    await admin.goto(`${BASE}/admin/users`);
    const listed = await admin.locator("section", { hasText: GUEST }).count();
    return { ok: signedOut && left === 0 && listed === 0, extra: `signedOut=${signedOut} bookingsLeft=${left} accountListed=${listed}` };
  });
  await check("A deleted account can no longer sign in", async () => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', GUEST);
    await page.fill('input[name="password"]', "gast-passwort-2");
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await page.getByText("E-Mail oder Passwort stimmen nicht.").waitFor({ timeout: 15_000 });
    return true;
  });
  await check("The activity log no longer shows the deleted guest's address", async () => {
    await admin.goto(`${BASE}/admin/activity`);
    const t = await admin.locator("main").innerText();
    return { ok: !t.includes(GUEST) && t.includes("Konto vom Gast gelöscht"), extra: t.includes(GUEST) ? "address still shown" : "anonymised" };
  });
  await check("The only owner cannot delete their own account", async () => {
    await admin.goto(`${BASE}/admin/users`);
    for (const promoted of await admin.locator("section", { hasText: "kollege@bar-05.test" }).getByRole("button", { name: "Zum Nutzer herabstufen" }).all()) await promoted.click();
    await admin.goto(`${BASE}/profile`);
    await admin.locator('input[name="confirm"]').fill(OWNER);
    await admin.getByRole("button", { name: "Konto endgültig löschen" }).click();
    await admin.getByText("Das einzige Inhaber-Konto kann nicht gelöscht werden").waitFor({ timeout: 15_000 });
    return true;
  });

  /* ================= MOBILE ================= */
  section = "Phone layout";
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await check("Homepage has no sideways scroll on a phone", async () => {
    await phone.goto(BASE, { waitUntil: "networkidle" });
    return !(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  });
  await check("Phone menu opens, links work, Escape closes", async () => {
    await phone.getByRole("button", { name: "Menü öffnen" }).click();
    await phone.locator("#mobile-menu").waitFor();
    const links = await phone.locator("#mobile-menu ul a").count();
    await phone.keyboard.press("Escape");
    await settle(phone, 900);
    return { ok: links === 4 && !(await phone.locator("#mobile-menu").count()), extra: `${links} links` };
  });
  await check("Admin, profile and login pages have no sideways scroll on a phone", async () => {
    await phone.context().addCookies(await ownerCtx.cookies());
    const wide = [];
    for (const p of ["/admin", "/admin/reservations", "/admin/menu", "/admin/hours", "/admin/users", "/admin/activity", "/profile", "/login"]) {
      await phone.goto(`${BASE}${p}`);
      if (await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) wide.push(p || "/");
    }
    return { ok: wide.length === 0, extra: wide.join(",") };
  });

  section = "Overall";
  await check("No JavaScript errors in any page", async () => ({ ok: pageErrors.length === 0, extra: pageErrors.slice(0, 2).join(" | ") }));
});
