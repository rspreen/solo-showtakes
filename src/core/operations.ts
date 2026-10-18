/**
 * The entry point to the operations layer: every action the site can
 * perform, built around one database (ADR 0002, ADR 0004).
 *
 * The web app calls `createOperations()` once per server process and pages
 * call methods on the result, such as `operations.allowlist.add(actor,
 * email)`. Tests call it with their throwaway database instead. Nothing in
 * `src/core/` imports a database directly; it all arrives through here.
 *
 * Operations are grouped by concept. Each area of `src/core/` (people,
 * catalog, opinions) provides its groups through a `create…Operations`
 * function; add a line below when a new group appears.
 */
import { type Database } from "@/db/client";
import { createAllowlistOperations } from "./people/allowlist.operations";

/** What the operations layer needs from its caller. */
export interface OperationDependencies {
  db: Database;
}

/** Builds every operation around the given dependencies. */
export function createOperations({ db }: OperationDependencies) {
  return {
    allowlist: createAllowlistOperations({ db }),
  };
}

/** The full set of operations, as returned by `createOperations`. */
export type Operations = ReturnType<typeof createOperations>;
