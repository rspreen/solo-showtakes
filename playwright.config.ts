/**
 * Playwright configuration: browser tests that drive the real site end to
 * end, run by `pnpm test:e2e`. Tests live in `e2e/`.
 *
 * Playwright starts the site itself on port 3100 (so it never collides with
 * a dev server you have open on 3000). In CI it runs the production build,
 * which the workflow builds first; locally it uses the dev server.
 */
import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // Chromium only for now; add Firefox and WebKit before public launch.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: isCI ? `pnpm start --port ${port}` : `pnpm dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
  },
});
