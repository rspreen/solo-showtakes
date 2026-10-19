/**
 * The operator Actor: whoever runs a script from a terminal, on a machine
 * with database access (ADR 0007). Scripts (`scripts/`) pass it to
 * operations as their Actor, so they reuse the same rules and logging as
 * the website, including for jobs no Member could do yet, such as
 * promoting the very first Admin.
 *
 * Kept in its own file so web code can be forbidden from importing it
 * (eslint.config.js): a page must never act as the operator. Permission
 * checks also refuse it inside the web server, in case one ever does
 * (permissions.ts).
 */
import { type OperatorActor } from "./actor";

/** The operator Actor, for scripts and their tests only. */
export const operator: OperatorActor = { kind: "operator" };
