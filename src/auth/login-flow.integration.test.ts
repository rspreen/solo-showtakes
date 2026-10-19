/**
 * The "Accounts and the invite allowlist" ticket's done-when, below the
 * browser: an invited email signs up, verifies, logs out, resets the password,
 * and logs back in.
 *
 * Signup goes through the signup operation, as the signup page does. Every
 * other step sends real HTTP requests to Better Auth's endpoints (the same
 * ones the login pages call from the browser), with links read from the
 * emails in Mailpit. The browser version of this is e2e/accounts.spec.ts.
 *
 * The services log through a real Pino logger into memory, so the test also
 * checks the actual log lines: each step's event, with the email and IP
 * address, and that neither password ever appears (ADR 0006).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { visitor } from "@/core/shared/actor";
import { allowlistEntry, member } from "@/core/people/schema";
import {
  deleteMessagesTo,
  firstLinkIn,
  textOfEmailTo,
} from "@/mail/testing/mailpit-inbox";
import { createPinoLogger } from "@/logging/pino-logger";
import { createCapturedOutput } from "@/logging/testing/captured-output";
import {
  createTestServicesWithLogger,
  testBaseUrl,
} from "@/wiring/testing/test-services";

const logOutput = createCapturedOutput();
const services = createTestServicesWithLogger(
  createPinoLogger({ level: "info", outputs: [logOutput.stream] }),
);
const { auth, db, operations } = services;

const email = `flow-${randomUUID().slice(0, 8)}@example.com`;
const handle = `flow_${randomUUID().slice(0, 8)}`;
const firstPassword = "the first long password";
const secondPassword = "the second long password";
/** The address every request below claims to come from, as a host reports it. */
const clientIp = "203.0.113.9";

/** The log lines written so far for `event`. */
function logLinesFor(event: string): Record<string, unknown>[] {
  return logOutput.lines().filter((line) => line.event === event);
}

/**
 * Sends one request to Better Auth's HTTP endpoints, as a browser on the
 * site would (same origin, optional session cookie).
 */
async function callAuth(
  pathOrUrl: string,
  options: { method?: "GET" | "POST"; body?: unknown; cookie?: string } = {},
): Promise<Response> {
  const url = new URL(pathOrUrl, `${testBaseUrl}/api/auth/`);
  const headers = new Headers({ Origin: testBaseUrl, "X-Forwarded-For": clientIp });
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  return auth.handler(
    new Request(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "manual",
    }),
  );
}

/** The session cookie a response sets, as a Cookie header value. */
function sessionCookieFrom(response: Response): string {
  const cookie = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .find((pair) => pair?.includes("session_token="));
  if (!cookie) {
    throw new Error(
      `Expected a session cookie; got status ${response.status} and ${JSON.stringify(response.headers.getSetCookie())}`,
    );
  }
  return cookie;
}

/** Who the session cookie belongs to, or null if it is not logged in. */
async function sessionHandle(cookie: string): Promise<string | null> {
  const response = await callAuth("get-session", { cookie });
  const body = (await response.json()) as { user?: { handle?: string } } | null;
  return body?.user?.handle ?? null;
}

afterAll(async () => {
  await db.delete(member).where(eq(member.email, email));
  await db.delete(allowlistEntry).where(eq(allowlistEntry.email, email));
  await deleteMessagesTo(email);
  await services.close();
});

describe("the login flow", () => {
  it("an invited email can sign up, verify, log out, reset the password, and log back in", async () => {
    await db.insert(allowlistEntry).values({ email });

    // Sign up.
    const signUp = await operations.accounts.signUp(visitor, {
      email,
      password: firstPassword,
      handle,
    });
    expect(signUp.ok).toBe(true);

    // Logging in before verifying is refused (and re-sends the link).
    const tooEarly = await callAuth("sign-in/email", {
      method: "POST",
      body: { email, password: firstPassword },
    });
    expect(tooEarly.status).toBe(403);

    // Verify: following the emailed link logs the new Member in.
    const verifyLink = firstLinkIn(
      await textOfEmailTo(email, "Confirm your email"),
    );
    const verified = await callAuth(verifyLink);
    expect(verified.status).toBe(302);
    const firstCookie = sessionCookieFrom(verified);
    expect(await sessionHandle(firstCookie)).toBe(handle);

    // Log out.
    const signedOut = await callAuth("sign-out", {
      method: "POST",
      body: {},
      cookie: firstCookie,
    });
    expect(signedOut.status).toBe(200);
    expect(await sessionHandle(firstCookie)).toBeNull();

    // Reset the password: request a link, follow it to get the token, then
    // set the new password with that token.
    await deleteMessagesTo(email);
    const resetRequested = await callAuth("request-password-reset", {
      method: "POST",
      body: { email, redirectTo: "/reset-password" },
    });
    expect(resetRequested.status).toBe(200);
    const resetLink = firstLinkIn(
      await textOfEmailTo(email, "Reset your Showtakes password"),
    );
    const resetRedirect = await callAuth(resetLink);
    const resetPage = new URL(resetRedirect.headers.get("Location") ?? "", testBaseUrl);
    expect(resetPage.pathname).toBe("/reset-password");
    const token = resetPage.searchParams.get("token");
    expect(token).toBeTruthy();
    const reset = await callAuth("reset-password", {
      method: "POST",
      body: { token, newPassword: secondPassword },
    });
    expect(reset.status).toBe(200);

    // Log back in: the old password no longer works; the new one does.
    const oldPassword = await callAuth("sign-in/email", {
      method: "POST",
      body: { email, password: firstPassword },
    });
    expect(oldPassword.status).toBe(401);
    const loggedIn = await callAuth("sign-in/email", {
      method: "POST",
      body: { email, password: secondPassword },
    });
    expect(loggedIn.status).toBe(200);
    expect(await sessionHandle(sessionCookieFrom(loggedIn))).toBe(handle);

    // Each step was logged, with the email (where the step has one) and
    // where the request came from.
    expect(logLinesFor("accounts.signup.succeeded")).toEqual([
      expect.objectContaining({ level: "info", email }),
    ]);
    expect(logLinesFor("auth.login.failed")).toEqual([
      expect.objectContaining({
        level: "warn",
        email,
        reason: "EMAIL_NOT_VERIFIED",
        ip: clientIp,
      }),
      expect.objectContaining({
        level: "warn",
        email,
        reason: "INVALID_EMAIL_OR_PASSWORD",
        ip: clientIp,
      }),
    ]);
    expect(logLinesFor("auth.email-verification.succeeded")).toEqual([
      expect.objectContaining({ level: "info", ip: clientIp }),
    ]);
    expect(logLinesFor("auth.logout.succeeded")).toHaveLength(1);
    expect(logLinesFor("auth.password-reset.requested")).toEqual([
      expect.objectContaining({ level: "info", email, ip: clientIp }),
    ]);
    expect(logLinesFor("auth.password-reset.succeeded")).toHaveLength(1);
    expect(logLinesFor("auth.login.succeeded")).toEqual([
      expect.objectContaining({ level: "info", email, memberId: expect.any(Number) }),
    ]);

    // Neither password appears anywhere in the log.
    expect(logOutput.text()).not.toContain(firstPassword);
    expect(logOutput.text()).not.toContain(secondPassword);
  });

  it("a bad verification link is logged as a failed verification", async () => {
    const response = await callAuth("verify-email?token=not-a-real-token&callbackURL=/");

    expect(response.status).toBe(302);
    expect(logLinesFor("auth.email-verification.failed")).toContainEqual(
      expect.objectContaining({ level: "warn", reason: "INVALID_TOKEN", ip: clientIp }),
    );
  });

  it("Better Auth's own public signup endpoint is switched off", async () => {
    const response = await callAuth("sign-up/email", {
      method: "POST",
      body: { email, password: firstPassword, name: "x", handle: "sneaky" },
    });

    expect(response.status).toBe(404);
  });
});
