import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end suite builds into its own folder (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Photos are resized by the Unsplash CDN itself; see lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
