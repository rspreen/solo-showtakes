/**
 * The Actor: who is performing an operation.
 *
 * Every operation in `src/core/` takes an Actor as its first argument
 * (ADR 0002). Pages build it once per request from the login session
 * (ticket 5): a Visitor when nobody is logged in, otherwise the Member's id
 * and roles. It deliberately carries only what permission checks need, not
 * a fully loaded Member; operations read anything else they need themselves.
 */

/** A role a Member can hold. A Member may hold both, either, or neither. */
export type Role = "curator" | "admin";

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

export type Actor = VisitorActor | MemberActor;

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
