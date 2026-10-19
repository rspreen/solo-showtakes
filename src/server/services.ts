/**
 * The web app's services (database, Better Auth, operations), built once
 * per server process from environment settings.
 *
 * Pages, server actions, and route handlers call `getServices()`. The
 * actual construction is in src/wiring/create-services.ts, shared with the
 * tests; this file only reads the settings and keeps one copy.
 *
 * `import "server-only"` makes the build fail if browser code ever imports
 * this file, which would otherwise risk leaking secrets into the page.
 */
import "server-only";
import { createMailerFromEnvironment } from "@/mail/create-mailer";
import { type Services, createServices } from "@/wiring/create-services";

// Kept on globalThis rather than in a module variable because the dev
// server reloads modules on every edit, which would otherwise open a new
// database pool each time.
const globalCache = globalThis as typeof globalThis & {
  showtakesServices?: Services;
};

/** Returns the process's services, building them on first use. */
export function getServices(): Services {
  globalCache.showtakesServices ??= createServices({
    databaseUrl: requireSetting("DATABASE_URL"),
    mailer: createMailerFromEnvironment(),
    baseUrl: requireSetting("BETTER_AUTH_URL"),
    authSecret: requireSetting("BETTER_AUTH_SECRET"),
  });
  return globalCache.showtakesServices;
}

/** Returns an environment setting, or throws if it is missing. */
function requireSetting(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Locally, copy it from .env.example into .env.`,
    );
  }
  return value;
}
