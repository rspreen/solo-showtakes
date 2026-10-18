/**
 * The return type for operations that have expected failures (ADR 0004).
 *
 * An expected failure is one a person can run into through a correct page:
 * a handle already taken, an email already on the allowlist. The operation
 * returns it as a value, its return type names every possible reason, and
 * TypeScript makes the page handle each one.
 *
 * Unexpected failures, which a correct page can never trigger, are thrown
 * instead (see `permissions.ts`).
 */

/** Either success with a `value`, or an expected failure with a `reason`. */
export type Result<Value, Reason extends string> =
  | { ok: true; value: Value }
  | { ok: false; reason: Reason };

/** Builds a successful Result, optionally carrying a value. */
export function ok(): { ok: true; value: undefined };
export function ok<Value>(value: Value): { ok: true; value: Value };
export function ok<Value>(value?: Value) {
  return { ok: true, value };
}

/** Builds an expected-failure Result with the given reason. */
export function failure<Reason extends string>(
  reason: Reason,
): { ok: false; reason: Reason } {
  return { ok: false, reason };
}
