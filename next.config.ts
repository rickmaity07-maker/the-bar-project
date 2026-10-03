import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end suite builds into its own folder (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Security of processing (Art. 32 DSGVO): conservative defaults for every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
    ];
  },
  images: {
    // Photos live in /public/photos and are resized by next/image on this domain.
    qualities: [70, 75, 80],
  },
};

export default nextConfig;
