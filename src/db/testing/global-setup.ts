/**
 * Vitest global setup for integration tests: runs once per `pnpm test`, before
 * any `*.integration.test.ts` file (wired up in vitest.config.mts).
 *
 * It creates a brand-new, uniquely named database on the Postgres server at
 * DATABASE_URL, applies every migration in `src/db/migrations/`, and hands
 * its URL to the tests (read it with `connectToTestDatabase()` from
 * `./test-database.ts`). When the run ends, the database is dropped. The
 * development database itself is never touched.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { createDatabase } from "../client";

const migrationsFolder = path.resolve(import.meta.dirname, "../migrations");

/**
 * Creates and migrates the throwaway database, and returns the teardown
 * function Vitest calls after the last test.
 */
export default async function setup(project: TestProject) {
  const serverUrl = process.env.DATABASE_URL;
  if (!serverUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env (cp .env.example .env).",
    );
  }

  // Database names cannot be parameterised in SQL, so the name is built only
  // from characters we generate ourselves.
  const testDatabaseName = `showtakes_test_${randomBytes(6).toString("hex")}`;
  const testDatabaseUrl = new URL(serverUrl);
  testDatabaseUrl.pathname = `/${testDatabaseName}`;

  await runOnServer(serverUrl, `CREATE DATABASE ${testDatabaseName}`);

  const connection = createDatabase(testDatabaseUrl.toString());
  try {
    await migrate(connection.db, { migrationsFolder });
  } finally {
    await connection.close();
  }

  project.provide("testDatabaseUrl", testDatabaseUrl.toString());

  return async function teardown() {
    // FORCE disconnects any connection a test forgot to close.
    await runOnServer(
      serverUrl,
      `DROP DATABASE IF EXISTS ${testDatabaseName} WITH (FORCE)`,
    );
  };
}

/**
 * Runs one SQL statement over a short-lived connection, with a clear message
 * if the Postgres container is not running.
 */
async function runOnServer(serverUrl: string, sql: string): Promise<void> {
  const client = new Client({ connectionString: serverUrl });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Cannot reach Postgres at ${redactPassword(serverUrl)}. ` +
        "Start it with `pnpm db:up` (needs OrbStack running).",
      { cause: error },
    );
  }
  try {
    await client.query(sql);
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
