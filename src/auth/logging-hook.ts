/**
 * Logs the outcome of each login-related request Better Auth handles
 * (ADR 0005, ADR 0006): logging in and out, verifying an email, and
 * requesting and completing a password reset. Signup is not here: the
 * signup operation logs its own outcomes.
 *
 * Better Auth runs this "after hook" (auth.ts) once each endpoint has
 * finished. It receives the request (its path, body, and headers) and what
 * the endpoint produced, in `ctx.context.returned`:
 * - a normal result on success;
 * - an `APIError` on failure, whose `body.code` names the reason, such as
 *   INVALID_EMAIL_OR_PASSWORD;
 * - for email verification, which ends by sending the browser elsewhere, a
 *   redirect (an `APIError` with status FOUND) whose address carries
 *   `?error=CODE` when the link was bad.
 *
 * The hook only reads; it never changes the response. Better Auth also runs
 * it for calls our server code makes, such as reading the session while a
 * page renders; those paths are not logged and return straight away.
 */
import { createAuthMiddleware, isAPIError } from "better-auth/api";
import { normalizeEmail } from "@/core/people/email";
import { type LogFields, type Logger } from "@/core/shared/logger";
import { requestContextFrom } from "@/logging/request-context";

/** The Better Auth endpoints whose outcomes are logged. */
const loggedPaths = new Set([
  "/sign-in/email",
  "/sign-out",
  "/verify-email",
  "/request-password-reset",
  "/reset-password",
]);

/** Builds the after hook, writing through `logger`. */
export function createAuthLoggingHook(logger: Logger) {
  return createAuthMiddleware(async (ctx) => {
    // Checked first: building the request context makes a random request
    // id, which Next.js forbids while it prerenders a page.
    if (!loggedPaths.has(ctx.path)) return;

    const requestLogger = logger.child(
      requestContextFrom(ctx.headers ?? new Headers()),
    );
    const outcome = outcomeOf(ctx.context.returned);
    // Every endpoint below takes the email, when it takes one, in its body.
    const email = emailIn(ctx.body);

    switch (ctx.path) {
      case "/sign-in/email":
        if (outcome.failed) {
          requestLogger.warn("auth.login.failed", { email, reason: outcome.reason });
        } else {
          requestLogger.info("auth.login.succeeded", {
            email,
            memberId: memberIdIn(ctx.context.returned),
          });
        }
        return;

      case "/sign-out":
        // Better Auth has already ended the session, so only where the
        // request came from is known here.
        requestLogger.info("auth.logout.succeeded");
        return;

      case "/verify-email":
        if (outcome.failed) {
          requestLogger.warn("auth.email-verification.failed", {
            reason: outcome.reason,
          });
        } else {
          requestLogger.info("auth.email-verification.succeeded");
        }
        return;

      case "/request-password-reset":
        // Logged the same whether or not the email has an account, as the
        // page shows the same thing either way (ADR 0005).
        requestLogger.info("auth.password-reset.requested", { email });
        return;

      case "/reset-password":
        if (outcome.failed) {
          requestLogger.warn("auth.password-reset.failed", { reason: outcome.reason });
        } else {
          requestLogger.info("auth.password-reset.succeeded");
        }
        return;
    }
  });
}

/** Whether an endpoint's result was a failure, and why. */
type Outcome = { failed: false } | { failed: true; reason: string };

/** Reads success or failure from what an endpoint returned. */
function outcomeOf(returned: unknown): Outcome {
  if (!isAPIError(returned)) return { failed: false };

  // A redirect is how verification ends either way; a bad link adds
  // `?error=CODE` to the address it sends the browser to.
  if (returned.statusCode === 302) {
    const location = new Headers(returned.headers).get("location") ?? "";
    const errorCode = new URL(location, "http://placeholder").searchParams.get("error");
    return errorCode ? { failed: true, reason: errorCode } : { failed: false };
  }

  const code = (returned.body as { code?: unknown } | undefined)?.code;
  return { failed: true, reason: typeof code === "string" ? code : String(returned.status) };
}

/** The `email` field of a request body, if it has one. */
function emailIn(body: unknown): LogFields["email"] {
  if (typeof body !== "object" || body === null || !("email" in body)) return undefined;
  return typeof body.email === "string" ? normalizeEmail(body.email) : undefined;
}

/** The Member id in a successful login's result, as a number (ADR 0003). */
function memberIdIn(returned: unknown): number | undefined {
  const id = (returned as { user?: { id?: unknown } } | undefined)?.user?.id;
  return id === undefined ? undefined : Number(id);
}
