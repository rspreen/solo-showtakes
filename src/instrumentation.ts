/**
 * Next.js instrumentation: hooks Next.js calls on the server (see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * instrumentation.md).
 *
 * `onRequestError` runs whenever a server request fails with an error
 * nothing handled: a page, server action, or route handler that threw. That
 * includes permission refusals (`PermissionRefusedError`, ADR 0004), which
 * a correct page never triggers, so each one is worth seeing. Each becomes
 * one `request.failed` line at `error` level (ADR 0006), with where the
 * request came from. Expected failures never reach here: operations return
 * those as Results, and they are logged where they happen.
 */
import { type Instrumentation } from "next";

/** Logs an unhandled server error. */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Only the Node.js server runs our services; the site has no code on
  // Next's lighter "edge" runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Imported here rather than at the top so this file stays loadable on
  // every runtime Next.js prepares it for.
  const [{ getServices }, { requestContextFrom }] = await Promise.all([
    import("@/server/services"),
    import("@/logging/request-context"),
  ]);

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  getServices()
    .logger.child(requestContextFrom(headers))
    .error("request.failed", {
      error,
      details: {
        method: request.method,
        path: request.path,
        // Page render, server action, or route handler.
        routeType: context.routeType,
        routePath: context.routePath,
      },
    });
};
