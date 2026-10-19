/**
 * The Logger: how any part of the site records that something happened
 * (ADR 0006).
 *
 * Every event is one structured log line with a fixed name from `LogEvent`
 * below and fields from `LogFields`, so a log service can search and filter
 * them ("all `auth.login.failed` for this email"). Levels say what kind of
 * event it is:
 * - `info`: something succeeded (a login, a signup).
 * - `warn`: something was refused or failed in an expected way (a wrong
 *   password, a signup from an email not on the allowlist).
 * - `error`: a fault: something went wrong that should not have.
 * `LOG_LEVEL` filters what is written, so `warn` hides the successes.
 *
 * This file is only the interface, so core code can log without knowing
 * how. The Pino adapter that writes the lines lives in src/logging/, and
 * tests use a recording logger (src/logging/testing/) to check what was
 * logged. Operations receive a Logger as a dependency, already carrying
 * the current request's IP address and request id (`child` below).
 */

/**
 * Every event the site logs. Add new names here, grouped by area, so the
 * full catalogue of what can appear in the log stays in one place.
 */
export type LogEvent =
  // Signup (src/core/people/accounts.operations.ts).
  | "accounts.signup.succeeded"
  | "accounts.signup.refused"
  // Allowlist (src/core/people/allowlist.operations.ts).
  | "allowlist.email.added"
  | "allowlist.email.already-listed"
  // Login mechanics handled by Better Auth (src/auth/auth.ts).
  | "auth.login.succeeded"
  | "auth.login.failed"
  | "auth.logout.succeeded"
  | "auth.email-verification.succeeded"
  | "auth.email-verification.failed"
  | "auth.password-reset.requested"
  | "auth.password-reset.succeeded"
  | "auth.password-reset.failed"
  // A message from Better Auth's own internals, passed through unchanged.
  | "auth.library.message"
  // A server request that failed with an unhandled error
  // (src/instrumentation.ts).
  | "request.failed";

/** Where a request came from; attached to every line a request logs. */
export interface RequestLogFields {
  /** The client's IP address, as reported by the host. */
  ip?: string;
  userAgent?: string;
  /** Ties together every line logged while handling one request. */
  requestId?: string;
  /** The logged-in Member, when there is one. */
  memberId?: number;
}

/** The fields an event can carry, beyond where its request came from. */
export interface LogFields extends RequestLogFields {
  /** Why something was refused or failed, such as "not-invited". */
  reason?: string;
  /**
   * The email involved, exactly as normalised, including emails that match
   * no Member or are not on the allowlist (ADR 0006).
   */
  email?: string;
  /** A human-readable message, for events passed through from libraries. */
  message?: string;
  /** Extra structured detail, such as a library's log arguments. */
  details?: unknown;
  /** The error behind an `error` event. */
  error?: unknown;
}

/** Records events. See the file comment for what each level means. */
export interface Logger {
  info(event: LogEvent, fields?: LogFields): void;
  warn(event: LogEvent, fields?: LogFields): void;
  error(event: LogEvent, fields?: LogFields): void;
  /**
   * Returns a logger that adds `fields` to every line it writes. Used to
   * build one logger per request carrying that request's IP address and id.
   */
  child(fields: RequestLogFields): Logger;
}
