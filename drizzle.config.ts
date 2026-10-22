/**
 * drizzle-kit configuration, used by the `pnpm db:*` scripts.
 *
 * - `pnpm db:generate` writes a SQL migration in `src/db/migrations/` from
 *   changes to `src/db/schema.ts`. Review and commit the generated files.
 * - `pnpm db:migrate` applies pending migrations to the database at
 *   DATABASE_URL (read from `.env`; see `.env.example`).
 *
 * On Vercel, `pnpm db:migrate` runs before every build (vercel.json;
 * ADR 0008), against production or the preview's own Neon branch.
 * There it uses DATABASE_URL_UNPOOLED, Neon's direct connection, set by the
 * Neon integration: Neon advises schema changes over a direct connection
 * rather than through its connection pooler, which the site itself uses.
 * Locally and in CI there is no pooler, so DATABASE_URL is used.
 *
 * Tests apply the same migrations from code instead (src/db/testing/).
 */
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Locally, copy .env.example to .env " +
      "(cp .env.example .env). On Vercel, link the Neon integration.",
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
