import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Geist_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const title = "Fathom | Die Bar am Grund des Atlantiks";
const description =
  "Tagsüber Café, nachts Cocktailbar. Griechischer Kaffee, Hauscocktails und lange Wochenenden, erzählt als Abstieg in den Atlantik.";

// Vercel provides the production domain at build time; link previews need absolute URLs.
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "de_DE", siteName: "Fathom" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#05090b",
  // Lets the ocean run under notches; the nav and footer pad themselves with safe-area insets.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${hanken.variable} ${geistMono.variable} ${bodoni.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
