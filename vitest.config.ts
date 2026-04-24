import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "apps/web/src"),
      "@creator-os/db": resolve(__dirname, "packages/db/src/index.ts"),
      "@creator-os/types": resolve(__dirname, "packages/types/src/index.ts"),
    },
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "apps/**/*.test.ts",
      "packages/**/*.test.ts",
    ],
    setupFiles: ["tests/setup.ts"],
    env: {
      NODE_ENV: "test",
    },
    environment: "node",
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
