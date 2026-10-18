/**
 * Operations on the allowlist: the emails allowed to sign up while the site
 * is invite-only.
 *
 * Reached through `createOperations()` in `src/core/operations.ts`, as
 * `operations.allowlist`. The admin allowlist screen (ticket 12) calls these;
 * signup (ticket 5) will check the allowlist through an operation here too.
 *
 * This is also the reference example of an operation (ADR 0002, ADR 0004):
 * Actor first, permission check first, expected failures returned as a
 * Result, and the database received from the caller rather than imported.
 */
import { type Database } from "@/db/client";
import { type Actor } from "../shared/actor";
import { requireRole } from "../shared/permissions";
import { type Result, failure, ok } from "../shared/result";
import { allowlistEntry } from "./schema";

/** Builds the allowlist operations around the given database. */
export function createAllowlistOperations({ db }: { db: Database }) {
  return {
    /**
     * Adds `email` to the allowlist. Admins only.
     *
     * Returns `already-listed` if the email is on the list already; an Admin
     * can do that through a correct page, so it is an expected failure.
     * Emails are stored as given: lowercasing and trimming arrive with
     * signup in ticket 5.
     */
    async add(
      actor: Actor,
      email: string,
    ): Promise<Result<void, "already-listed">> {
      requireRole(actor, "admin", "add an email to the allowlist");

      // ON CONFLICT DO NOTHING returns no row when the email exists, which
      // tells us it was already listed without a separate query.
      const inserted = await db
        .insert(allowlistEntry)
        .values({ email })
        .onConflictDoNothing()
        .returning({ email: allowlistEntry.email });

      if (inserted.length === 0) return failure("already-listed");
      return ok();
    },
  };
}
