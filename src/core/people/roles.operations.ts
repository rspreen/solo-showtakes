/**
 * Roles: which Members are Curators or Admins (CONTEXT.md), and the
 * operations that change them.
 *
 * Reached as `operations.roles` (src/core/operations.ts). Today the only
 * caller is the promote-admin script (scripts/promote-admin.ts), acting as
 * the operator (ADR 0007); the admin screens (the "Admin: members and
 * allowlist" ticket) will call the same operations as an Admin Member.
 *
 * `memberActorFor` is how a logged-in Member's roles reach their Actor:
 * src/server/actor.ts calls it on each request, so a granted or revoked
 * role takes effect on the Member's next page.
 */
import { eq } from "drizzle-orm";
import { type Database } from "@/db/client";
import {
  type Actor,
  type MemberActor,
  type Role,
  memberActor,
  roles,
} from "../shared/actor";
import { type Logger } from "../shared/logger";
import { requireRole } from "../shared/permissions";
import { type Result, failure, ok } from "../shared/result";
import { normalizeEmail } from "./email";
import { member, memberRole } from "./schema";

/**
 * Builds the Actor for the Member with `memberId`, with the roles they hold
 * now. Not an operation (it takes no Actor): it is how an Actor is made.
 */
export async function memberActorFor(
  db: Database,
  memberId: number,
): Promise<MemberActor> {
  const rows = await db
    .select({ role: memberRole.role })
    .from(memberRole)
    .where(eq(memberRole.memberId, memberId));
  // Sorted in the order `roles` lists them, so Actors compare predictably.
  const held = new Set(rows.map((row) => row.role));
  return memberActor(memberId, roles.filter((role) => held.has(role)));
}

/** Expected reasons granting a role can fail. */
export type GrantRoleFailure = "no-such-member" | "already-held";

/** Builds the role operations. */
export function createRoleOperations({
  db,
  logger,
}: {
  db: Database;
  logger: Logger;
}) {
  return {
    /**
     * Gives `role` to the Member whose login email is `email`. Admins and
     * the operator only.
     *
     * The Member is named by email, not id, because that is what a person
     * running the promote script knows; emails are unique (schema.ts).
     * Fails with `no-such-member` if no Member has that email, and
     * `already-held` if they hold the role already.
     */
    async grant(
      actor: Actor,
      email: string,
      role: Role,
    ): Promise<Result<void, GrantRoleFailure>> {
      requireRole(actor, "admin", `give a Member the ${role} role`);
      const normalizedEmail = normalizeEmail(email);

      const [target] = await db
        .select({ id: member.id })
        .from(member)
        .where(eq(member.email, normalizedEmail));
      if (!target) {
        logger.info("roles.role.not-granted", {
          reason: "no-such-member",
          role,
          email: normalizedEmail,
        });
        return failure("no-such-member");
      }

      // ON CONFLICT DO NOTHING returns no row when the Member already holds
      // the role (the key is Member id plus role).
      const inserted = await db
        .insert(memberRole)
        .values({ memberId: target.id, role })
        .onConflictDoNothing()
        .returning({ role: memberRole.role });
      if (inserted.length === 0) {
        logger.info("roles.role.not-granted", {
          reason: "already-held",
          role,
          email: normalizedEmail,
          targetMemberId: target.id,
        });
        return failure("already-held");
      }

      logger.info("roles.role.granted", {
        role,
        email: normalizedEmail,
        targetMemberId: target.id,
      });
      return ok();
    },
  };
}
