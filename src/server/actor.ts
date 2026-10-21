/**
 * Works out who is making the current request, as an Actor (ADR 0002).
 *
 * Server pages and server actions call `getActor()` and pass the result as
 * the first argument to every operation. It reads the session cookie
 * through Better Auth, which checks it against the session table, so a
 * forged or expired cookie gives a Visitor.
 *
 * The Actor's roles are read from the database on every request
 * (`memberActorFor`), not stored in the session, so granting or revoking a
 * role takes effect on the Member's next page.
 *
 * React's `cache` makes repeated calls within one request share a single
 * lookup.
 */
import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { memberActorFor } from "@/core/people/roles.operations";
import { type Actor, visitor } from "@/core/shared/actor";
import { getServices } from "./services";

/** The logged-in Member's handle and display name, for showing in pages. */
export interface CurrentMember {
  memberId: number;
  handle: string;
  displayName: string;
}

/**
 * Returns the logged-in Member's details, or null for a Visitor.
 * Cached per request.
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  // Read the request's headers before touching the services. While the
  // build prerenders a page, `headers()` stops rendering here (the part is
  // filled in at request time instead), so the services, which need
  // DATABASE_URL and the other secrets, are never built during the build.
  // Written the other way round, JavaScript would call getServices() before
  // evaluating the `headers` argument.
  const requestHeaders = await headers();
  const session = await getServices().auth.api.getSession({
    headers: requestHeaders,
  });
  if (!session) return null;
  return {
    // Better Auth hands ids around as text; ours are integers (ADR 0003).
    memberId: Number(session.user.id),
    handle: session.user.handle,
    // Better Auth calls it `name`; auth.ts maps it to our display_name column.
    displayName: session.user.name,
  };
});

/**
 * Returns the Actor for the current request, with the Member's roles.
 * Cached per request.
 */
export const getActor = cache(async (): Promise<Actor> => {
  const current = await getCurrentMember();
  if (!current) return visitor;
  return memberActorFor(getServices().db, current.memberId);
});
