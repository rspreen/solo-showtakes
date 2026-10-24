/**
 * Better Auth's HTTP endpoints, served at /api/auth/* (login, logout,
 * session lookup, email verification links, password reset).
 *
 * In Next.js, a `route.ts` file answers HTTP requests directly instead of
 * rendering a page (like a Django view returning JSON). The `[...all]`
 * folder name matches every path below /api/auth and hands it to Better
 * Auth, configured in src/auth/auth.ts.
 *
 * Requests Better Auth refuses for coming too often (HTTP 429; see
 * `rateLimit` in auth.ts) are logged here, because Better Auth refuses them
 * before its own hooks run, so src/auth/logging-hook.ts never sees them.
 */
import { toNextJsHandler } from "better-auth/next-js";
import { requestContextFrom } from "@/logging/request-context";
import { getServices } from "@/server/services";

/** Passes the request to Better Auth, built on first use. */
async function handle(request: Request): Promise<Response> {
  const services = getServices();
  const response = await services.auth.handler(request);
  if (response.status === 429) {
    services.logger.child(requestContextFrom(request.headers)).warn("request.rate-limited", {
      reason: new URL(request.url).pathname,
      details: { retryAfterSeconds: Number(response.headers.get("X-Retry-After")) },
    });
  }
  return response;
}

export const { GET, POST } = toNextJsHandler(handle);
