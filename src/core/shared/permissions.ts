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
 *
 * The operator (scripts; ADR 0007) is handled the same way by every check:
 * - `requireRole` lets it through, whatever the role: anyone running a
 *   script already has full database access.
 * - `requireMember` and `requireVisitor` refuse it: those actions need a
 *   Member's own identity, or a person who is logged out.
 * - Inside the web server, every check refuses it outright, as a backstop
 *   should web code ever construct one.
 */
import {
  type Actor,
  type MemberActor,
  type OperatorActor,
  type Role,
  hasRole,
} from "./actor";

/**
 * Why an Actor was refused:
 * - `login-required`: a Visitor attempted something only Members can do.
 * - `not-permitted`: a Member lacks the role or ownership needed, or the
 *   operator attempted something only a Member or Visitor can do.
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
  refuseOperatorInWebServer(actor, action);
  if (actor.kind === "visitor") {
    throw new PermissionRefusedError(
      "login-required",
      `A Visitor tried to ${action}; only logged-in Members may.`,
    );
  }
  if (actor.kind === "operator") {
    throw new PermissionRefusedError(
      "not-permitted",
      `The operator tried to ${action}; only a logged-in Member may, as it acts as that Member.`,
    );
  }
}

/**
 * Refuses unless `actor` is a Visitor, for actions that only make sense
 * when logged out (signing up). `action` describes what was attempted.
 */
export function requireVisitor(actor: Actor, action: string): void {
  refuseOperatorInWebServer(actor, action);
  if (actor.kind === "member") {
    throw new PermissionRefusedError(
      "not-permitted",
      `Member ${actor.memberId} tried to ${action}; only Visitors may.`,
    );
  }
  if (actor.kind === "operator") {
    throw new PermissionRefusedError(
      "not-permitted",
      `The operator tried to ${action}; only Visitors may.`,
    );
  }
}

/**
 * Refuses unless `actor` is a Member holding `role`, or the operator.
 * `action` describes what was attempted ("add an email to the allowlist"),
 * for the error message.
 */
export function requireRole(
  actor: Actor,
  role: Role,
  action: string,
): asserts actor is MemberActor | OperatorActor {
  refuseOperatorInWebServer(actor, action);
  if (actor.kind === "operator") return;
  requireMember(actor, action);
  if (!hasRole(actor, role)) {
    throw new PermissionRefusedError(
      "not-permitted",
      `Member ${actor.memberId} tried to ${action}; only a Member with the ${role} role may.`,
    );
  }
}

/**
 * Refuses the operator when this code is running inside the Next.js web
 * server, which sets NEXT_RUNTIME. Scripts and tests run outside it.
 */
function refuseOperatorInWebServer(actor: Actor, action: string): void {
  if (actor.kind === "operator" && process.env.NEXT_RUNTIME) {
    throw new PermissionRefusedError(
      "not-permitted",
      `The operator tried to ${action} inside the web server; only scripts may act as the operator (ADR 0007).`,
    );
  }
}
