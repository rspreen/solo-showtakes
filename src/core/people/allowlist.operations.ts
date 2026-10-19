/**
 * Operations on the allowlist: the emails allowed to sign up while the site
 * is invite-only.
 *
 * Reached through `createOperations()` in `src/core/operations.ts`, as
 * `operations.allowlist`. The admin allowlist screen (ticket 13) calls these;
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
import { eq } from "drizzle-orm";
import { normalizeEmail } from "./email";
import { allowlistEntry } from "./schema";

/**
 * True when `email` is on the allowlist. Not an operation (it takes no
 * Actor): it is the shared check behind signup (`accounts.operations.ts`)
 * and Better Auth's account-creation guard (src/auth/auth.ts).
 */
export async function isEmailOnAllowlist(
  db: Database,
  email: string,
): Promise<boolean> {
  const rows = await db
    .select({ email: allowlistEntry.email })
    .from(allowlistEntry)
    .where(eq(allowlistEntry.email, normalizeEmail(email)));
  return rows.length > 0;
}

/** Builds the allowlist operations around the given database. */
export function createAllowlistOperations({ db }: { db: Database }) {
  return {
    /**
     * Adds `email` to the allowlist. Admins only.
     *
     * Returns `already-listed` if the email is on the list already; an Admin
     * can do that through a correct page, so it is an expected failure.
     * The email is trimmed and lowercased first, as signup does.
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
        .values({ email: normalizeEmail(email) })
        .onConflictDoNothing()
        .returning({ email: allowlistEntry.email });

      if (inserted.length === 0) return failure("already-listed");
      return ok();
    },
  };
}
