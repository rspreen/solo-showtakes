/**
 * Builds the services from environment settings (`.env` locally, the
 * host's settings in production), failing at startup with a descriptive
 * message if one is missing.
 *
 * Shared by the web app (src/server/services.ts) and scripts (`scripts/`),
 * so both run against the same database, Mailer, and Logger settings.
 * Tests use ./testing/test-services.ts instead.
 */
import { createLoggerFromEnvironment } from "@/logging/create-logger";
import { createMailerFromEnvironment } from "@/mail/create-mailer";
import { type Services, createServices } from "./create-services";

/** Builds the services from `process.env`. */
export function createServicesFromEnvironment(): Services {
  return createServices({
    databaseUrl: requireSetting("DATABASE_URL"),
    mailer: createMailerFromEnvironment(),
    logger: createLoggerFromEnvironment(),
    baseUrl: requireSetting("BETTER_AUTH_URL"),
    authSecret: requireSetting("BETTER_AUTH_SECRET"),
    // `next start` and Vercel run with NODE_ENV=production; `next dev`,
    // tests, and scripts do not.
    rateLimiting: process.env.NODE_ENV === "production",
  });
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
