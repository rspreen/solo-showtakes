/**
 * Rate limiting for our own server actions, which Better Auth's limiter
 * never sees: it only checks requests to its /api/auth endpoints, while a
 * server action calls Better Auth directly from the server.
 *
 * Uses the same database-backed limiter as Better Auth
 * (src/rate-limit/rate-limiter.ts, built in src/wiring/create-services.ts),
 * counted per IP address. With RATE_LIMITING=off the limiter allows
 * everything.
 *
 *   if (await isOverRateLimit("signup", signupRateLimit)) {
 *     return { failure: "too-many-attempts", ... };
 *   }
 */
import "server-only";
import { headers } from "next/headers";
import { requestContextFrom } from "@/logging/request-context";
import { type RateLimitRule } from "@/rate-limit/rate-limiter";
import { getRequestLogger } from "./operations";
import { getServices } from "./services";

/**
 * Records one `action` from this request's IP address and returns true if
 * it has now happened too often under `rule`; the caller should then refuse
 * it. Each refusal is logged as `request.rate-limited`.
 */
export async function isOverRateLimit(
  action: string,
  rule: RateLimitRule,
): Promise<boolean> {
  // Without an address (never expected on Vercel), all such requests share
  // one counter, as Better Auth does: stricter, but never unlimited.
  const ip = requestContextFrom(await headers()).ip ?? "no-ip";
  // Same "<ip>|<what>" shape as Better Auth's keys, in the same table.
  const decision = await getServices().rateLimiter.consume(`${ip}|action:${action}`, rule);
  if (decision.allowed) return false;

  const logger = await getRequestLogger();
  logger.warn("request.rate-limited", {
    reason: `action:${action}`,
    details: { retryAfterSeconds: decision.retryAfter },
  });
  return true;
}
