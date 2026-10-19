/**
 * The database the browser tests run against: `showtakes_e2e`, on the same
 * Postgres server as DATABASE_URL, so they never touch development data.
 *
 * playwright.config.ts points the site server at it; global-setup.ts
 * creates and migrates it; tests read and write it directly for setup and
 * cleanup (`withE2eDatabase`). It is kept between runs (dropping it could cut
 * off a server Playwright is reusing), so tests use unique data and delete
 * what they create.
 */
import "dotenv/config";
import { Client } from "pg";

const e2eDatabaseName = "showtakes_e2e";

/** The Postgres URL of the browser-test database. */
export function e2eDatabaseUrl(): string {
  const serverUrl = process.env.DATABASE_URL;
  if (!serverUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  const url = new URL(serverUrl);
  url.pathname = `/${e2eDatabaseName}`;
  return url.toString();
}

/** The name of the browser-test database. */
export { e2eDatabaseName };

/**
 * Runs `work` with a short-lived connection to the browser-test database,
 * for test setup and cleanup.
 */
export async function withE2eDatabase<T>(
  work: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
