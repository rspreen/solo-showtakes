/**
 * drizzle-kit configuration, used by the `pnpm db:*` scripts.
 *
 * - `pnpm db:generate` writes a SQL migration in `src/db/migrations/` from
 *   changes to `src/db/schema.ts`. Review and commit the generated files.
 * - `pnpm db:migrate` applies pending migrations to the database at
 *   DATABASE_URL (read from `.env`; see `.env.example`).
 *
 * Tests apply the same migrations from code instead (src/db/testing/).
 */
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env (cp .env.example .env).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: databaseUrl },
  // Fail rather than guess when a migration might lose data, e.g. ask whether
  // a column was renamed or dropped and re-added.
  strict: true,
});
