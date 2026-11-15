import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Seite nicht gefunden | Bar-05",
  robots: { index: false },
};

/* Any address that doesn't exist: stays in the bar's look and leads back in. */
export default async function NotFound() {
  // Rendered per request, so its scripts get this response's CSP nonce (a prebuilt page has none and would be blocked).
  await connection();
  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-14 md:py-20">
      <Link href="/" className="display wordmark text-2xl tracking-[0.14em] text-foam">
        BAR-05
      </Link>
      <p className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-mist">Fehler 404 · Error 404</p>
      <h1 className="display mt-3 text-[clamp(2.5rem,6vw,4rem)] leading-none text-foam">Hier ist nur Wasser.</h1>
      <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-foam/85">
        Diese Seite gibt es nicht, oder nicht mehr. Karte, Öffnungszeiten und Reservierung findet ihr auf der Startseite.
      </p>
      <p lang="en" className="mt-2 max-w-[60ch] text-base leading-relaxed text-mist">
        This page doesn&apos;t exist. The menu, opening hours and bookings are on the homepage.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center rounded-full bg-buoy px-6 font-medium text-abyss transition-colors hover:bg-buoy-deep"
      >
        Zur Startseite
      </Link>
    </main>
  );
}
