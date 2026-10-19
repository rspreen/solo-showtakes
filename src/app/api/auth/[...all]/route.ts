/**
 * Better Auth's HTTP endpoints, served at /api/auth/* (login, logout,
 * session lookup, email verification links, password reset).
 *
 * In Next.js, a `route.ts` file answers HTTP requests directly instead of
 * rendering a page (like a Django view returning JSON). The `[...all]`
 * folder name matches every path below /api/auth and hands it to Better
 * Auth, configured in src/auth/auth.ts.
 */
import { toNextJsHandler } from "better-auth/next-js";
import { getServices } from "@/server/services";

/** Passes the request to Better Auth, built on first use. */
function handle(request: Request): Promise<Response> {
  return getServices().auth.handler(request);
}

export const { GET, POST } = toNextJsHandler(handle);
