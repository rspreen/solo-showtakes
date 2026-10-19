/**
 * The entry point to the operations layer: every action the site can
 * perform, built around one database (ADR 0002, ADR 0004).
 *
 * src/wiring/create-services.ts calls `createOperations()` once per server
 * process (and once per test file, around the throwaway database), and
 * pages call methods on the result, such as `operations.allowlist.add(actor,
 * email)`. Nothing in `src/core/` imports a database directly; it all
 * arrives through here.
 *
 * Operations are grouped by concept. Each area of `src/core/` (people,
 * catalog, opinions) provides its groups through a `create…Operations`
 * function; add a line below when a new group appears.
 */
import { type Database } from "@/db/client";
import {
  type MemberAccountCreator,
  createAccountOperations,
} from "./people/accounts.operations";
import { createAllowlistOperations } from "./people/allowlist.operations";

/**
 * What the operations layer needs from its caller. Built in
 * src/wiring/create-services.ts.
 */
export interface OperationDependencies {
  db: Database;
  /** Creates Member logins; implemented with Better Auth in src/auth/. */
  accountCreator: MemberAccountCreator;
}

/** Builds every operation around the given dependencies. */
export function createOperations({ db, accountCreator }: OperationDependencies) {
  return {
    accounts: createAccountOperations({ db, accountCreator }),
    allowlist: createAllowlistOperations({ db }),
  };
}

/** The full set of operations, as returned by `createOperations`. */
export type Operations = ReturnType<typeof createOperations>;
