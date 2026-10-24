/**
 * The table behind rate limiting (rate-limiter.ts): one row per thing being
 * counted, such as "login attempts from this IP address".
 *
 * These are the small decision counters ADR 0006 keeps in the database;
 * the history of what happened goes to the log instead. Rows are
 * short-lived: the limiter deletes any older than an hour as it goes.
 *
 * Gathered with the other tables in `src/db/schema.ts`, so `pnpm
 * db:generate` sees it.
 */
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rateLimitCounter = pgTable(
  "rate_limit_counter",
  {
    /** What is counted, such as Better Auth's "<ip>|/sign-in/email". */
    key: text("key").primaryKey(),
    /** Requests seen in the current window, including refused ones. */
    count: integer("count").notNull(),
    /** When the current window began; it lasts the rule's `window`. */
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  },
  // Lets the clean-up find old rows without reading the whole table.
  (table) => [index("rate_limit_counter_window_started_at_idx").on(table.windowStartedAt)],
);
