/**
 * Account operations: signing up as a new Member.
 *
 * Reached as `operations.accounts` (src/core/operations.ts) from the signup
 * page's server action (src/app/signup/). Logging in, logging out, email
 * verification, and password reset are not here: they hold no Showtakes
 * rules, so pages call Better Auth for them directly (ADR 0005).
 *
 * Signup carries our rules (the invite allowlist and handle format), so it
 * is an operation. The account itself is created by Better Auth, which this
 * file reaches only through the `MemberAccountCreator` interface below; the
 * adapter that implements it lives in src/auth/. Keeping Better Auth behind
 * an interface means core code never depends on its types, and tests could
 * replace it.
 */
import { eq } from "drizzle-orm";
import { type Database } from "@/db/client";
import { type Actor } from "../shared/actor";
import { requireVisitor } from "../shared/permissions";
import { type Result, failure, ok } from "../shared/result";
import { isEmailOnAllowlist } from "./allowlist.operations";
import { normalizeEmail } from "./email";
import { type HandleProblem, parseHandle } from "./handle";
import { type PasswordProblem, checkPassword } from "./password";
import { member } from "./schema";

/** What the account library must do for signup. Implemented in src/auth/. */
export interface MemberAccountCreator {
  /**
   * Creates an unverified Member with a password login and sends the
   * email-verification message. If the email already has an account, it
   * must instead behave exactly as for a new one (so signup never reveals
   * which emails are registered) and notify that account's owner.
   */
  createWithPassword(details: {
    email: string;
    password: string;
    handle: string;
    displayName: string;
  }): Promise<void>;
}

/** What a person filled in on the signup form. */
export interface SignUpDetails {
  email: string;
  password: string;
  handle: string;
}

/** Expected reasons signup can fail; the page explains each. */
export type SignUpFailure =
  | "invalid-email"
  | "not-invited"
  | PasswordProblem
  | HandleProblem
  | "handle-taken";

/** Builds the account operations. */
export function createAccountOperations({
  db,
  accountCreator,
}: {
  db: Database;
  accountCreator: MemberAccountCreator;
}) {
  return {
    /**
     * Signs up a new Member, if their email is on the allowlist. On success
     * a verification email has been sent; the Member logs in after clicking
     * its link. The display name starts equal to the handle.
     *
     * An email that already has an account also returns success (and its
     * owner gets an email), so signup cannot be used to discover who is a
     * Member.
     */
    async signUp(
      actor: Actor,
      details: SignUpDetails,
    ): Promise<Result<void, SignUpFailure>> {
      requireVisitor(actor, "sign up");

      const email = normalizeEmail(details.email);
      if (!looksLikeEmail(email)) return failure("invalid-email");
      if (!(await isEmailOnAllowlist(db, email))) return failure("not-invited");

      const passwordCheck = checkPassword(details.password);
      if (!passwordCheck.ok) return passwordCheck;

      const parsedHandle = parseHandle(details.handle);
      if (!parsedHandle.ok) return parsedHandle;
      const handle = parsedHandle.value;
      if (await isHandleTaken(db, handle)) return failure("handle-taken");

      await accountCreator.createWithPassword({
        email,
        password: details.password,
        handle,
        displayName: handle,
      });
      return ok();
    },
  };
}

/**
 * A basic shape check: something@something.something, no spaces. The
 * verification email is the real test of an address.
 */
function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** True when a Member already has `handle`. */
async function isHandleTaken(db: Database, handle: string): Promise<boolean> {
  const rows = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.handle, handle));
  return rows.length > 0;
}
