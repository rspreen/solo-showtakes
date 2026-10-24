/**
 * The operations for the current request, for pages and server actions.
 *
 *   const operations = await getOperations();
 *   await operations.accounts.signUp(await getActor(), details);
 *
 * Built per request (and shared within it, by React's `cache`) because
 * their Logger carries where the request came from: its IP address, user
 * agent, request id, and the logged-in Member's id (ADR 0006). Building
 * them only creates objects; the database pool and Better Auth are the
 * process-wide ones from ./services.ts.
 */
import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { type Operations } from "@/core/operations";
import { type Logger } from "@/core/shared/logger";
import { requestContextFrom } from "@/logging/request-context";
import { getCurrentMember } from "./actor";
import { getServices } from "./services";

/**
 * Returns a Logger carrying this request's details, for server code that
 * logs outside an operation (such as ./rate-limit.ts). Cached per request.
 */
export const getRequestLogger = cache(async (): Promise<Logger> => {
  const [requestHeaders, currentMember] = await Promise.all([
    headers(),
    getCurrentMember(),
  ]);
  return getServices().logger.child({
    ...requestContextFrom(requestHeaders),
    memberId: currentMember?.memberId,
  });
});

/** Returns the operations for this request. Cached per request. */
export const getOperations = cache(async (): Promise<Operations> => {
  return getServices().operationsFor(await getRequestLogger());
});
