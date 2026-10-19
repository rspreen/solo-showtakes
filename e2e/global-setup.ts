/**
 * Playwright global setup: runs once before the browser tests (wired up in
 * playwright.config.ts). Creates the browser-test database if it does not
 * exist yet and applies any new migrations, so it always matches the
 * current schema.
 */
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { e2eDatabaseName, e2eDatabaseUrl } from "./support/e2e-database";

/** Creates (if needed) and migrates the browser-test database. */
export default async function globalSetup(): Promise<void> {
  const serverClient = new Client({ connectionString: process.env.DATABASE_URL });
  await serverClient.connect();
  try {
    const existing = await serverClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [e2eDatabaseName],
    );
    if (existing.rowCount === 0) {
      await serverClient.query(`CREATE DATABASE ${e2eDatabaseName}`);
    }
  } finally {
    await serverClient.end();
  }

  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    await migrate(drizzle({ client }), {
      // import.meta.dirname is the folder this file is in (e2e/).
      migrationsFolder: path.resolve(import.meta.dirname, "../src/db/migrations"),
    });
  } finally {
    await client.end();
  }
}
