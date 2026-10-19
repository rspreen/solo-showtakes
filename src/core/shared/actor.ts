/**
 * The Actor: who is performing an operation.
 *
 * Every operation in `src/core/` takes an Actor as its first argument
 * (ADR 0002). Pages build it once per request from the login session (the
 * "Accounts and the invite allowlist" ticket): a Visitor when nobody is logged
 * in, otherwise the Member's id and roles. It deliberately carries only what
 * permission checks need, not a fully loaded Member; operations read anything
 * else they need themselves.
 *
 * Scripts run from a terminal (`scripts/`) act as the third kind, the
 * operator (ADR 0007): whoever runs a script on a machine with database
 * access. The operator value itself lives in `operator.ts`, which web code
 * may not import.
 */

/**
 * The roles a Member can hold (CONTEXT.md). A Member may hold both, either,
 * or neither. The database's role type is built from this list
 * (src/core/people/schema.ts), so the two cannot drift apart.
 */
export const roles = ["curator", "admin"] as const;
export type Role = (typeof roles)[number];

/** Someone using the site without being logged in. */
export interface VisitorActor {
  kind: "visitor";
}

/** A logged-in Member, identified by id, with the roles they hold. */
export interface MemberActor {
  kind: "member";
  memberId: number;
  roles: readonly Role[];
}

/**
 * Whoever runs a script from a terminal (ADR 0007). Admin-only operations
 * accept it; operations needing a Member's identity refuse it. See
 * permissions.ts.
 */
export interface OperatorActor {
  kind: "operator";
}

export type Actor = VisitorActor | MemberActor | OperatorActor;

/** The Actor for anyone who is not logged in. */
export const visitor: VisitorActor = { kind: "visitor" };

/** Builds the Actor for the Member with `memberId`, holding `roles`. */
export function memberActor(
  memberId: number,
  roles: readonly Role[] = [],
): MemberActor {
  return { kind: "member", memberId, roles };
}

/** True when `actor` is a Member holding `role`. */
export function hasRole(actor: Actor, role: Role): boolean {
  return actor.kind === "member" && actor.roles.includes(role);
}
