import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${root}/`,
      // Next's guard against importing server code in the browser; tests run on the server side anyway.
      "server-only": `${root}/tests/support/empty.ts`,
    },
  },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node", testTimeout: 20_000 },
});
