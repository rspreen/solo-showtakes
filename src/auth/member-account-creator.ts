/**
 * Connects the signup operation to Better Auth: implements the
 * `MemberAccountCreator` interface from src/core/people/accounts.operations.ts
 * by calling Better Auth's signup function on the server.
 *
 * This is the only place core code reaches Better Auth, and it does so
 * without importing it: src/wiring/ hands this adapter to the operations.
 */
import { type MemberAccountCreator } from "@/core/people/accounts.operations";
import { type Auth } from "./auth";

/** Builds the account creator around a configured Better Auth instance. */
export function createMemberAccountCreator(auth: Auth): MemberAccountCreator {
  return {
    async createWithPassword({ email, password, handle, displayName }) {
      // Better Auth sends the verification email itself (auth.ts). Its
      // link returns the new Member to the home page, logged in.
      await auth.api.signUpEmail({
        body: { email, password, handle, name: displayName, callbackURL: "/" },
      });
    },
  };
}
