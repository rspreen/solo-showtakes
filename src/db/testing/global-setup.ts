/**
 * Vitest global setup for integration tests: runs once per `pnpm test`, before
 * any `*.integration.test.ts` file (wired up in vitest.config.ts).
 *
 * It creates a brand-new, uniquely named database on the Postgres server at
 * DATABASE_URL, applies every migration in `src/db/migrations/`, and hands
 * its URL to the tests (`createTestServices()` in
 * src/wiring/testing/test-services.ts builds the site around it). When the
 * run ends, the database is dropped. The
 * development database itself is never touched.
 *
 * Leftovers: a run that is killed (Ctrl-C, crash, Docker stopping) never
 * reaches its teardown, so its database stays behind. Each run therefore
 * first drops test databases older than a day; the age limit means it can
 * never drop one that a concurrent run is still using.
 *
 * Debugging: `KEEP_TEST_DB=1 pnpm test` skips the drop and prints the
 * database name, so you can inspect what the tests left in it (psql or
 * `pnpm db:studio` with DATABASE_URL pointed at it). The next day's sweep
 * removes it.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { createDatabase } from "../client";

const migrationsFolder = path.resolve(import.meta.dirname, "../migrations");

/** Test databases older than this are assumed abandoned and dropped. */
const staleAfterMilliseconds = 24 * 60 * 60 * 1000;

/**
 * Test database names: `showtakes_test_<creation time in Unix seconds>_<hex>`.
 * The timestamp is what lets the sweep tell abandoned databases from live
 * ones; the random part keeps concurrent runs apart.
 */
const testDatabaseNamePattern = /^showtakes_test_(\d+)_[0-9a-f]+$/;

/**
 * Sweeps stale test databases, creates and migrates this run's one, and
 * returns the teardown function Vitest calls after the last test.
 */
export default async function setup(project: TestProject) {
  const serverUrl = process.env.DATABASE_URL;
  if (!serverUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (cp .env.example .env).",
    );
  }
  const keepTestDatabase = process.env.KEEP_TEST_DB === "1";

  // Database names cannot be parameterised in SQL, so the name is built only
  // from characters we generate ourselves.
  const createdAtSeconds = Math.floor(Date.now() / 1000);
  const testDatabaseName = `showtakes_test_${createdAtSeconds}_${randomBytes(6).toString("hex")}`;
  const testDatabaseUrl = new URL(serverUrl);
  testDatabaseUrl.pathname = `/${testDatabaseName}`;

  await withServerClient(serverUrl, async (client) => {
    await dropStaleTestDatabases(client, Date.now());
    await client.query(`CREATE DATABASE ${testDatabaseName}`);
  });

  const connection = createDatabase(testDatabaseUrl.toString());
  try {
    await migrate(connection.db, { migrationsFolder });
  } finally {
    await connection.close();
  }

  project.provide("testDatabaseUrl", testDatabaseUrl.toString());

  return async function teardown() {
    if (keepTestDatabase) {
      console.log(
        `\nKEEP_TEST_DB=1: kept test database ${testDatabaseName}\n` +
          `  ${redactPassword(testDatabaseUrl.toString())}\n`,
      );
      return;
    }
    // FORCE disconnects any connection a test forgot to close.
    await withServerClient(serverUrl, (client) =>
      client.query(`DROP DATABASE IF EXISTS ${testDatabaseName} WITH (FORCE)`),
    );
  };
}

/**
 * Drops every test database created more than `staleAfterMilliseconds`
 * before `nowMilliseconds`. Databases whose names do not match the expected
 * pattern are left alone, since their age cannot be known.
 */
async function dropStaleTestDatabases(
  client: Client,
  nowMilliseconds: number,
): Promise<void> {
  const result = await client.query<{ datname: string }>(
    "SELECT datname FROM pg_database WHERE datname LIKE 'showtakes\\_test\\_%'",
  );
  for (const { datname } of result.rows) {
    const createdAtSeconds = testDatabaseNamePattern.exec(datname)?.[1];
    if (createdAtSeconds === undefined) continue;
    const ageMilliseconds = nowMilliseconds - Number(createdAtSeconds) * 1000;
    if (ageMilliseconds < staleAfterMilliseconds) continue;
    // Safe to interpolate: the name matched testDatabaseNamePattern above.
    await client.query(`DROP DATABASE IF EXISTS ${datname} WITH (FORCE)`);
  }
}

/**
 * Opens a short-lived connection to the Postgres server, runs `work` with
 * it, and closes it. Fails with a clear message if the Postgres container
 * is not running.
 */
async function withServerClient<T>(
  serverUrl: string,
  work: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: serverUrl });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Cannot reach Postgres at ${redactPassword(serverUrl)}. ` +
        "Start it with `pnpm services:up` (needs OrbStack running).",
      { cause: error },
    );
  }
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

/** Returns the URL with its password masked, for error messages. */
function redactPassword(url: string): string {
  const parsed = new URL(url);
  if (parsed.password) parsed.password = "***";
  return parsed.toString();
}

// Tells TypeScript the type of the value provided above, so that
// `inject("testDatabaseUrl")` in tests is typed as a string.
declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}
