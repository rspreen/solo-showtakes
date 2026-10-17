/**
 * Database schema: the single source of truth for every table.
 *
 * Drizzle reads this file in two ways:
 * - `pnpm db:generate` (drizzle-kit) compares it with the committed migrations
 *   in `src/db/migrations/` and writes a new SQL migration for any difference.
 * - Application code imports these table objects to build type-checked
 *   queries (`db.select().from(allowlistEntry)`).
 *
 * Never edit the database by hand; change this file and generate a migration.
 * Only `src/operations/` should query these tables (ADR 0002).
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
