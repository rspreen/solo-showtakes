/**
 * Database tables for the People area: Members, roles, the allowlist, and
 * later Follow.
 *
 * Each area of `src/core/` keeps its tables in its own `schema.ts`, and
 * `src/db/schema.ts` gathers them all. Drizzle uses them in two ways:
 * - `pnpm db:generate` (drizzle-kit) compares them with the committed
 *   migrations in `src/db/migrations/` and writes a new SQL migration for any
 *   difference.
 * - Operations import these table objects to build type-checked queries
 *   (`db.select().from(allowlistEntry)`).
 *
 * Never edit the database by hand; change a schema file and generate a
 * migration. Only operations (`*.operations.ts`) should query these tables
 * (ADR 0002, ADR 0004).
 */
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Email addresses allowed to sign up while the site is invite-only.
 * Ticket 5 enforces the rule at signup and normalises emails (lowercasing)
 * before they are stored here.
 */
export const allowlistEntry = pgTable("allowlist_entry", {
  email: text("email").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
