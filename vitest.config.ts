/**
 * Vitest configuration: unit and integration tests, run by `pnpm test`.
 *
 * Tests live next to the code they test. Two projects:
 * - unit: `*.test.ts`, pure code, no database. `pnpm test:unit` runs only
 *   these, so they work without Docker.
 * - integration: `*.integration.test.ts`, run against a throwaway Postgres
 *   database created by src/db/testing/global-setup.ts. Needs `pnpm services:up`.
 *
 * Browser tests are separate (Playwright, in `e2e/`) and excluded here.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

const integrationTestPattern = "src/**/*.integration.test.ts";

export default defineConfig({
  resolve: {
    // Mirror the `@/` import alias from tsconfig.json so tests resolve
    // `@/core/...` the same way the app does.
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // Plain Node, no simulated browser: business rules and operations
    // (src/core) must not need one (ADR 0002).
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: [integrationTestPattern],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: [integrationTestPattern],
          globalSetup: ["src/db/testing/global-setup.ts"],
        },
      },
    ],
  },
});
