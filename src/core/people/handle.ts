/**
 * Handle rules: the format of a Member's public @handle.
 *
 * Pure functions, used by signup (`accounts.operations.ts`) now and by
 * profile editing (ticket 11) later. Uniqueness is not checked here: it
 * needs the database, so the operation and a unique index handle it.
 *
 * The rules (docs/TASKS.md, ticket 5): 2 to 30 characters; only letters,
 * numbers, periods, and underscores; starting with a letter or number; no
 * two periods in a row; stored lowercased. "Letters" means a to z: handles
 * appear in URLs, and lookalike characters from other alphabets would let
 * one handle impersonate another.
 */
import { type Result, failure, ok } from "../shared/result";

export const minimumHandleLength = 2;
export const maximumHandleLength = 30;

/** Why a proposed handle is not allowed. */
export type HandleProblem =
  | "handle-too-short"
  | "handle-too-long"
  | "handle-invalid-characters"
  | "handle-must-start-with-letter-or-number"
  | "handle-consecutive-periods";

/**
 * Normalises what a person typed into handle form (trimmed, lowercased)
 * and checks it against the format rules. Returns the normalised handle,
 * or the first rule it breaks.
 */
export function parseHandle(input: string): Result<string, HandleProblem> {
  const handle = input.trim().toLowerCase();

  if (handle.length < minimumHandleLength) return failure("handle-too-short");
  if (handle.length > maximumHandleLength) return failure("handle-too-long");
  if (!/^[a-z0-9._]+$/.test(handle)) return failure("handle-invalid-characters");
  if (!/^[a-z0-9]/.test(handle)) {
    return failure("handle-must-start-with-letter-or-number");
  }
  if (handle.includes("..")) return failure("handle-consecutive-periods");
  return ok(handle);
}
