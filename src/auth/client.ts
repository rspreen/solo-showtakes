/**
 * Better Auth's browser client: what the login, logout, and password-reset
 * forms call (ADR 0005). Each call is an HTTP request to Better Auth's
 * endpoints under /api/auth on this same site
 * (src/app/api/auth/[...all]/route.ts), which set or clear the session
 * cookie.
 *
 * Signup is deliberately absent: it goes through the signup operation.
 */
import { createAuthClient } from "better-auth/react";

/** The client, talking to the site the page was loaded from. */
export const authClient = createAuthClient();
