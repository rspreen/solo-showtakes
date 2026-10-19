/**
 * Works out who is making the current request, as an Actor (ADR 0002).
 *
 * Server pages and server actions call `getActor()` and pass the result as
 * the first argument to every operation. It reads the session cookie
 * through Better Auth, which checks it against the session table, so a
 * forged or expired cookie gives a Visitor.
 *
 * React's `cache` makes repeated calls within one request share a single
 * lookup.
 */
import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { type Actor, memberActor, visitor } from "@/core/shared/actor";
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
  const session = await getServices().auth.api.getSession({
    headers: await headers(),
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

/** Returns the Actor for the current request. */
export async function getActor(): Promise<Actor> {
  const current = await getCurrentMember();
  if (!current) return visitor;
  // Roles are added by ticket 6; until then no Member holds one.
  return memberActor(current.memberId, []);
}
