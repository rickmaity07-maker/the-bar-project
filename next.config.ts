import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/csp";

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
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        ],
      },
      {
        // The signed-in pages get a stricter, per-request policy with a nonce from proxy.ts (see lib/csp.ts).
        source: "/((?!admin|profile|login).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy() }],
      },
    ];
  },
  images: {
    // Photos live in /public/photos and are resized by next/image on this domain.
    qualities: [70, 75, 80],
  },
};

export default nextConfig;
