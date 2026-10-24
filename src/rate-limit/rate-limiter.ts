/**
 * Rate limiting: refuses a request when the same thing (such as "logins
 * from this IP address") has happened too often recently.
 *
 * Counters live in the database (`rate_limit_counter`, ./schema.ts), not in
 * memory, because on Vercel many short-lived copies of the server handle
 * requests side by side, each with its own memory (ADR 0006). Two parts of
 * the site use the one limiter, built in src/wiring/create-services.ts:
 * - Better Auth, for its login, password reset, and verification endpoints
 *   (its `rateLimit.customStorage` option, src/auth/auth.ts). Its interface
 *   matches `RateLimiter` below exactly.
 * - The signup server action (src/server/rate-limit.ts).
 *
 * How a rule works: a window opens with the first request for a key and
 * lasts `window` seconds; at most `max` requests are allowed in it, and the
 * rest are refused until the window ends. Refused requests still count, so
 * hammering does not help.
 */
import { lt, sql } from "drizzle-orm";
import { type Database } from "@/db/client";
import { rateLimitCounter } from "./schema";

/** A limit: at most `max` requests per `window` seconds. */
export interface RateLimitRule {
  window: number;
  max: number;
}

/** Whether a request may go ahead, and if not, how long until it may. */
export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the window ends, when refused; otherwise null. */
  retryAfter: number | null;
}

/** Records one request against `key` and decides whether it is allowed. */
export interface RateLimiter {
  consume(key: string, rule: RateLimitRule): Promise<RateLimitDecision>;
}

/**
 * The longest window a rule may use. Rows older than this are deleted, so
 * a longer window would be cut short; rules beyond it are refused.
 */
export const longestWindowInSeconds = 60 * 60;

/** Builds the database-backed limiter. */
export function createRateLimiter(db: Database): RateLimiter {
  return {
    async consume(key, rule) {
      checkRule(rule);

      // One statement, so it is atomic: Postgres locks the row while it
      // updates it, so requests arriving together are counted one after
      // another and cannot all slip under the limit. Time comes from the
      // database's clock (now()), the same for every server.
      // - No row yet: insert one, count 1, window starting now.
      // - Row whose window has ended: restart it at count 1.
      // - Otherwise: add one to the count.
      const windowLength = sql`make_interval(secs => ${rule.window})`;
      const windowEnded = sql`${rateLimitCounter.windowStartedAt} <= now() - ${windowLength}`;
      const [row] = await db
        .insert(rateLimitCounter)
        .values({ key, count: 1, windowStartedAt: sql`now()` })
        .onConflictDoUpdate({
          target: rateLimitCounter.key,
          set: {
            count: sql`CASE WHEN ${windowEnded} THEN 1 ELSE ${rateLimitCounter.count} + 1 END`,
            windowStartedAt: sql`CASE WHEN ${windowEnded} THEN now() ELSE ${rateLimitCounter.windowStartedAt} END`,
          },
        })
        .returning({
          count: rateLimitCounter.count,
          secondsLeft: sql<number>`ceil(extract(epoch from ${rateLimitCounter.windowStartedAt} + ${windowLength} - now()))::int`,
        });
      if (!row) throw new Error(`Rate limit counter for "${key}" was not written.`);

      // A new window is a good moment to clear out counters nobody has
      // used for an hour, so the table stays small without a separate job.
      if (row.count === 1) await deleteOldCounters(db);

      if (row.count <= rule.max) return { allowed: true, retryAfter: null };
      return { allowed: false, retryAfter: Math.max(1, row.secondsLeft) };
    },
  };
}

/** A limiter that allows everything, for when rate limiting is switched off. */
export const unlimitedRateLimiter: RateLimiter = {
  consume: async () => ({ allowed: true, retryAfter: null }),
};

/** Throws if a rule could not work as written. */
function checkRule({ window, max }: RateLimitRule): void {
  if (!Number.isInteger(window) || window < 1 || window > longestWindowInSeconds) {
    throw new Error(
      `Rate limit window must be a whole number of seconds from 1 to ${longestWindowInSeconds}; got ${window}.`,
    );
  }
  if (!Number.isInteger(max) || max < 1) {
    throw new Error(`Rate limit max must be a whole number of at least 1; got ${max}.`);
  }
}

/** Deletes counters whose window began over an hour ago. */
async function deleteOldCounters(db: Database): Promise<void> {
  await db
    .delete(rateLimitCounter)
    .where(
      lt(
        rateLimitCounter.windowStartedAt,
        sql`now() - make_interval(secs => ${longestWindowInSeconds})`,
      ),
    );
}
