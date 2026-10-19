/**
 * Permission checks, and the one way operations refuse an Actor (ADR 0004).
 *
 * A permission refusal means the Actor lacks the login, role, or ownership
 * an operation needs. A correct page never offers such an action (it hides
 * the button, or asks the Visitor to log in first), so reaching one means a
 * page has a bug or someone is tampering with requests. Operations therefore
 * throw PermissionRefusedError rather than returning it: the request fails
 * fast, Next.js shows its error page, and no caller can carry on as if the
 * action had succeeded.
 *
 * Expected failures are different and are returned instead (see `result.ts`).
 */
import { type Actor, type MemberActor, type Role, hasRole } from "./actor";

/**
 * Why an Actor was refused:
 * - `login-required`: a Visitor attempted something only Members can do.
 * - `not-permitted`: a Member lacks the role or ownership needed.
 */
export type PermissionRefusalReason = "login-required" | "not-permitted";

/** Thrown when an Actor attempts an operation they are not allowed to do. */
export class PermissionRefusedError extends Error {
  override name = "PermissionRefusedError";

  constructor(
    readonly reason: PermissionRefusalReason,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Refuses unless `actor` is a logged-in Member. `action` describes what was
 * attempted ("rate a production"), for the error message.
 */
export function requireMember(
  actor: Actor,
  action: string,
): asserts actor is MemberActor {
  if (actor.kind !== "member") {
    throw new PermissionRefusedError(
      "login-required",
      `A Visitor tried to ${action}; only logged-in Members may.`,
    );
  }
}

/**
 * Refuses unless `actor` is a Visitor, for actions that only make sense
 * when logged out (signing up). `action` describes what was attempted.
 */
export function requireVisitor(actor: Actor, action: string): void {
  if (actor.kind !== "visitor") {
    throw new PermissionRefusedError(
      "not-permitted",
      `Member ${actor.memberId} tried to ${action}; only Visitors may.`,
    );
  }
}

/**
 * Refuses unless `actor` is a Member holding `role`. `action` describes what
 * was attempted ("add an email to the allowlist"), for the error message.
 */
export function requireRole(
  actor: Actor,
  role: Role,
  action: string,
): asserts actor is MemberActor {
  requireMember(actor, action);
  if (!hasRole(actor, role)) {
    throw new PermissionRefusedError(
      "not-permitted",
      `Member ${actor.memberId} tried to ${action}; only a Member with the ${role} role may.`,
    );
  }
}
