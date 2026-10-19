/**
 * Email address normalisation, so one address is always stored and
 * compared the same way (on the allowlist, and on Member accounts).
 *
 * Pure; used by the allowlist and account operations.
 */

/**
 * Trims and lowercases an email address. Strictly, the part before the @
 * may be case-sensitive, but no mainstream provider treats it so, and
 * lowercasing stops "Roger@x.com" and "roger@x.com" becoming two accounts.
 */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}
