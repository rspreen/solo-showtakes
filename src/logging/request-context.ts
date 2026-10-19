/**
 * Works out where a request came from, for attaching to every line it
 * logs (ADR 0006): the client's IP address, its browser (user agent), and
 * a request id.
 *
 * Used by src/server/operations.ts (pages and server actions) and by Better
 * Auth's logging hook (src/auth/auth.ts), so both report requests the same
 * way. Pure: it reads only the headers it is given.
 */
import { randomUUID } from "node:crypto";
import { type RequestLogFields } from "@/core/shared/logger";

/**
 * The request's IP address, user agent, and id, from its headers.
 *
 * - IP address: the first entry of `x-forwarded-for`. Our host (Vercel)
 *   replaces that header with the address it saw, so a browser cannot
 *   forge it there; locally, Next.js's server sets it. Missing means
 *   unknown, and the field is left out.
 * - Request id: Vercel's `x-vercel-id` when present, so our lines can be
 *   matched with Vercel's own request logs; otherwise a fresh random id.
 */
export function requestContextFrom(headers: Headers): RequestLogFields {
  const forwardedFor = headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || undefined;
  const userAgent = headers.get("user-agent") ?? undefined;
  const requestId = headers.get("x-vercel-id") ?? randomUUID();
  return { ip, userAgent, requestId };
}
