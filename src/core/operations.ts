/**
 * The entry point to the operations layer: every action the site can
 * perform, built around one database (ADR 0002, ADR 0004).
 *
 * Built once per request (src/server/operations.ts), because the Logger it
 * receives carries that request's IP address and id (ADR 0006); building is
 * cheap, as it only creates objects. Pages call methods on the result, such
 * as `operations.allowlist.add(actor, email)`. Tests build it around their
 * throwaway database (src/wiring/testing/). Nothing in `src/core/` imports a
 * database directly; it all arrives through here.
 *
 * Operations are grouped by concept. Each area of `src/core/` (people,
 * catalog, opinions) provides its groups through a `create…Operations`
 * function; add a line below when a new group appears.
 */
import { type Database } from "@/db/client";
import { type Logger } from "./shared/logger";
import {
  type MemberAccountCreator,
  createAccountOperations,
} from "./people/accounts.operations";
import { createAllowlistOperations } from "./people/allowlist.operations";
import { createRoleOperations } from "./people/roles.operations";

/**
 * What the operations layer needs from its caller. Built in
 * src/wiring/create-services.ts.
 */
export interface OperationDependencies {
  db: Database;
  /** Creates Member logins; implemented with Better Auth in src/auth/. */
  accountCreator: MemberAccountCreator;
  /** Records what happens, carrying the current request's details. */
  logger: Logger;
}

/** Builds every operation around the given dependencies. */
export function createOperations({
  db,
  accountCreator,
  logger,
}: OperationDependencies) {
  return {
    accounts: createAccountOperations({ db, accountCreator, logger }),
    allowlist: createAllowlistOperations({ db, logger }),
    roles: createRoleOperations({ db, logger }),
  };
}

/** The full set of operations, as returned by `createOperations`. */
export type Operations = ReturnType<typeof createOperations>;
