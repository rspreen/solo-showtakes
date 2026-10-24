/**
 * Test helper: builds the whole site's services (database, Better Auth,
 * operations) exactly as the web app does, but around this test run's
 * throwaway database, the local Mailpit inbox, and a recording logger.
 *
 * Typical use in a `*.integration.test.ts` file:
 *
 *   const services = createTestServices();
 *   afterAll(() => services.close());
 *   ... services.operations.accounts.signUp(...) ...
 *   expect(services.logger.entries).toContainEqual(...);
 *
 * `operations` is built once around `logger`, standing in for the web
 * app's one-per-request operations (src/server/operations.ts). Every event
 * the services log, including Better Auth's, is kept in `logger.entries`.
 *
 * A test that needs the real log output (such as checking that secrets are
 * redacted) passes its own Logger to `createTestServicesWithLogger`.
 */
import "dotenv/config";
import { inject } from "vitest";
import { type Logger } from "@/core/shared/logger";
import { createRecordingLogger } from "@/logging/testing/recording-logger";
import { createMailerFromEnvironment } from "@/mail/create-mailer";
import { createServices } from "../create-services";

/** The address emailed links point to in tests. Nothing listens on it. */
export const testBaseUrl = "http://localhost:3000";

/** Builds the services around the test database, with a recording logger. */
export function createTestServices() {
  return createTestServicesWithLogger(createRecordingLogger());
}

/** Builds the services around the test database, logging to `logger`. */
export function createTestServicesWithLogger<TLogger extends Logger>(
  logger: TLogger,
) {
  const services = createServices({
    databaseUrl: inject("testDatabaseUrl"),
    // MAIL_PROVIDER=mailpit in .env and CI, so mail lands in Mailpit.
    mailer: createMailerFromEnvironment(),
    logger,
    baseUrl: testBaseUrl,
    authSecret: "test-only-secret-for-signing-tokens-0123456789",
    // Off, so tests can repeat logins freely; the limiter has its own
    // tests (src/rate-limit/).
    rateLimiting: false,
  });
  return { ...services, logger, operations: services.operationsFor(logger) };
}
