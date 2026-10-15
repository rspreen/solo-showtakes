/**
 * Vitest configuration: unit and integration tests, run by `pnpm test`.
 *
 * Tests live next to the code they test, named `*.test.ts`. Browser tests
 * are separate (Playwright, in `e2e/`) and excluded here.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@/` import alias from tsconfig.json so tests resolve
    // `@/domain/...` the same way the app does.
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    // Plain Node, no simulated browser: domain and operations code must not
    // need one (ADR 0002).
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
