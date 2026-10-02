import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Photos are resized by the Unsplash CDN itself; see lib/image-loader.ts.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
