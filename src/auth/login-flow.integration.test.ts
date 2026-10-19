/**
 * Ticket 5's done-when, below the browser: an invited email signs up,
 * verifies, logs out, resets the password, and logs back in.
 *
 * Signup goes through the signup operation, as the signup page does. Every
 * other step sends real HTTP requests to Better Auth's endpoints (the same
 * ones the login pages call from the browser), with links read from the
 * emails in Mailpit. The browser version of this is e2e/accounts.spec.ts.
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
import {
  createTestServices,
  testBaseUrl,
} from "@/wiring/testing/test-services";

const services = createTestServices();
const { auth, db, operations } = services;

const email = `flow-${randomUUID().slice(0, 8)}@example.com`;
const handle = `flow_${randomUUID().slice(0, 8)}`;
const firstPassword = "the first long password";
const secondPassword = "the second long password";

/**
 * Sends one request to Better Auth's HTTP endpoints, as a browser on the
 * site would (same origin, optional session cookie).
 */
async function callAuth(
  pathOrUrl: string,
  options: { method?: "GET" | "POST"; body?: unknown; cookie?: string } = {},
): Promise<Response> {
  const url = new URL(pathOrUrl, `${testBaseUrl}/api/auth/`);
  const headers = new Headers({ Origin: testBaseUrl });
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
  });

  it("Better Auth's own public signup endpoint is switched off", async () => {
    const response = await callAuth("sign-up/email", {
      method: "POST",
      body: { email, password: firstPassword, name: "x", handle: "sneaky" },
    });

    expect(response.status).toBe(404);
  });
});
