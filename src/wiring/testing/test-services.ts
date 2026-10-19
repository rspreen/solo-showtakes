/**
 * Test helper: builds the whole site's services (database, Better Auth,
 * operations) exactly as the web app does, but around this test run's
 * throwaway database and the local Mailpit inbox.
 *
 * Typical use in a `*.integration.test.ts` file:
 *
 *   const services = createTestServices();
 *   afterAll(() => services.close());
 */
import "dotenv/config";
import { inject } from "vitest";
import { createMailerFromEnvironment } from "@/mail/create-mailer";
import { createServices } from "../create-services";

/** The address emailed links point to in tests. Nothing listens on it. */
export const testBaseUrl = "http://localhost:3000";

/** Builds the services around the test database. */
export function createTestServices() {
  return createServices({
    databaseUrl: inject("testDatabaseUrl"),
    // MAIL_PROVIDER=mailpit in .env and CI, so mail lands in Mailpit.
    mailer: createMailerFromEnvironment(),
    baseUrl: testBaseUrl,
    authSecret: "test-only-secret-for-signing-tokens-0123456789",
  });
}
