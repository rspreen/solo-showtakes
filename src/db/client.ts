/**
 * Creates database connections.
 *
 * There is deliberately no shared, importable `db` object. Whoever needs a
 * database creates one here and passes it down: the web app once per server
 * process, tests once per test file against their throwaway database. The
 * operations layer receives it as a parameter (ADR 0002), which is what lets
 * tests run whole scenarios against a database of their choosing.
 */
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/** A Drizzle database handle that knows every table in `schema.ts`. */
export type Database = NodePgDatabase<typeof schema>;

/** A database handle plus the means to shut down its connection pool. */
export interface DatabaseConnection {
  db: Database;
  /** Closes every pooled connection. Call once when finished. */
  close: () => Promise<void>;
}

/**
 * Opens a connection pool to the Postgres database at `connectionUrl`
 * (a `postgres://user:password@host:port/name` URL).
 */
export function createDatabase(connectionUrl: string): DatabaseConnection {
  const pool = new Pool({ connectionString: connectionUrl });
  const db = drizzle({ client: pool, schema });
  return { db, close: () => pool.end() };
}
