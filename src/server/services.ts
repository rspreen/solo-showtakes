/**
 * The web app's services (database, Mailer, Logger, Better Auth), built
 * once per server process from environment settings.
 *
 * Route handlers and src/server/ call `getServices()`; pages and server
 * actions reach operations through `getOperations()` (./operations.ts),
 * which adds the request's details to the Logger. The construction is in
 * src/wiring/ (shared with scripts and tests); this file only keeps one
 * copy per process.
 *
 * `import "server-only"` makes the build fail if browser code ever imports
 * this file, which would otherwise risk leaking secrets into the page.
 */
import "server-only";
import { type Services } from "@/wiring/create-services";
import { createServicesFromEnvironment } from "@/wiring/create-services-from-environment";

// Kept on globalThis rather than in a module variable because the dev
// server reloads modules on every edit, which would otherwise open a new
// database pool each time.
const globalCache = globalThis as typeof globalThis & {
  showtakesServices?: Services;
};

/** Returns the process's services, building them on first use. */
export function getServices(): Services {
  globalCache.showtakesServices ??= createServicesFromEnvironment();
  return globalCache.showtakesServices;
}
