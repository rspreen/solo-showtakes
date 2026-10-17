/**
 * Helper for integration tests: connects to the throwaway database that
 * `global-setup.ts` created for this test run.
 *
 * Typical use in a `*.integration.test.ts` file:
 *
 *   const connection = connectToTestDatabase();
 *   afterAll(() => connection.close());
 *
 * Test files run in parallel against this one shared database, so each test
 * must create its own rows (with values no other test uses), delete them
 * afterwards, and never assume a table is empty.
 */
import { inject } from "vitest";
import { createDatabase, type DatabaseConnection } from "../client";

/** Opens a connection pool to this run's throwaway test database. */
export function connectToTestDatabase(): DatabaseConnection {
  return createDatabase(inject("testDatabaseUrl"));
}
