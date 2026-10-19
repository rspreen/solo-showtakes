/**
 * Playwright configuration: browser tests that drive the real site end to
 * end, run by `pnpm test:e2e`. Tests live in `e2e/`.
 *
 * Playwright starts the site itself on port 3100 (so it never collides with
 * a dev server you have open on 3000). In CI it runs the production build,
 * which the workflow builds first; locally it uses the dev server.
 *
 * The server uses its own database, `showtakes_e2e` (e2e/support/), prepared
 * by e2e/global-setup.ts, and sends mail to the local Mailpit inbox. Links
 * in those emails point at this port, so the tests can follow them.
 */
import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl } from "./e2e/support/e2e-database";

const port = 3100;
const baseURL = `http://localhost:${port}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  // Chromium only for now; add Firefox and WebKit before public launch.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: isCI ? `pnpm start --port ${port}` : `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    // Added to the settings from .env (or CI's), which the server inherits.
    env: {
      DATABASE_URL: e2eDatabaseUrl(),
      BETTER_AUTH_URL: baseURL,
      MAIL_PROVIDER: "mailpit",
    },
  },
});
