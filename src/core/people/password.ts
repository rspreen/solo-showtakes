/**
 * Password rules. Pure; checked by signup (`accounts.operations.ts`) so the
 * form can explain a problem, and given to Better Auth (src/auth/auth.ts)
 * so password reset enforces the same limits.
 *
 * Only length is checked. Current guidance (NIST SP 800-63B) is against
 * composition rules such as "must contain a digit"; length matters most.
 * The maximum stops very long inputs being used to make hashing slow.
 */
import { type Result, failure, ok } from "../shared/result";

export const minimumPasswordLength = 12;
export const maximumPasswordLength = 128;

export type PasswordProblem = "password-too-short" | "password-too-long";

/** Checks a proposed password against the length rules. */
export function checkPassword(password: string): Result<void, PasswordProblem> {
  if (password.length < minimumPasswordLength) {
    return failure("password-too-short");
  }
  if (password.length > maximumPasswordLength) {
    return failure("password-too-long");
  }
  return ok();
}
