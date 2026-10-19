/**
 * Integration tests for signup, against the throwaway database, real Better
 * Auth, and the local Mailpit inbox. Each test reads as a scenario: as some
 * Actor, sign up with some details, expect an outcome.
 *
 * The rest of the login flow (verify, log in, log out, reset) is tested in
 * src/auth/login-flow.integration.test.ts.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  deleteMessagesTo,
  messagesTo,
  textOfEmailTo,
} from "@/mail/testing/mailpit-inbox";
import { createTestServices } from "@/wiring/testing/test-services";
import { memberActor, visitor } from "../shared/actor";
import { PermissionRefusedError } from "../shared/permissions";
import { allowlistEntry, member } from "./schema";

const services = createTestServices();
const { db, operations } = services;

// Unique per test file run, so parallel test files never collide.
const runId = randomUUID().slice(0, 8);
const invitedEmail = `invited-${runId}@example.com`;
const uninvitedEmail = `uninvited-${runId}@example.com`;
const handle = `member_${runId}`;
const password = "a perfectly long password";

/** Puts `email` on the allowlist, as an Admin would. */
async function invite(email: string): Promise<void> {
  await db.insert(allowlistEntry).values({ email }).onConflictDoNothing();
}

afterEach(async () => {
  await db.delete(member).where(eq(member.email, invitedEmail));
  await db.delete(allowlistEntry).where(eq(allowlistEntry.email, invitedEmail));
  await deleteMessagesTo(invitedEmail);
  await deleteMessagesTo(uninvitedEmail);
});

afterAll(() => services.close());

describe("accounts.signUp", () => {
  it("as a Visitor with an invited email: creates the Member and emails a verification link", async () => {
    await invite(invitedEmail);

    const result = await operations.accounts.signUp(visitor, {
      email: invitedEmail,
      password,
      handle,
    });

    expect(result).toEqual({ ok: true, value: undefined });
    const [created] = await db
      .select()
      .from(member)
      .where(eq(member.email, invitedEmail));
    expect(created).toMatchObject({
      handle,
      displayName: handle,
      emailVerified: false,
    });
    expect(await textOfEmailTo(invitedEmail, "Confirm your email")).toContain(
      "/api/auth/verify-email?token=",
    );
  });

  it("normalises the email and handle as typed", async () => {
    await invite(invitedEmail);

    await operations.accounts.signUp(visitor, {
      email: `  ${invitedEmail.toUpperCase()} `,
      password,
      handle: ` ${handle.toUpperCase()}`,
    });

    const [created] = await db
      .select()
      .from(member)
      .where(eq(member.email, invitedEmail));
    expect(created?.handle).toBe(handle);
  });

  it("as a Visitor with an email not on the allowlist: refused as not-invited, nothing created or sent", async () => {
    const result = await operations.accounts.signUp(visitor, {
      email: uninvitedEmail,
      password,
      handle,
    });

    expect(result).toEqual({ ok: false, reason: "not-invited" });
    const rows = await db
      .select()
      .from(member)
      .where(eq(member.email, uninvitedEmail));
    expect(rows).toHaveLength(0);
    expect(await messagesTo(uninvitedEmail)).toHaveLength(0);
  });

  it("with a malformed handle: reports which rule it breaks", async () => {
    await invite(invitedEmail);

    const result = await operations.accounts.signUp(visitor, {
      email: invitedEmail,
      password,
      handle: "no..double.periods",
    });

    expect(result).toEqual({ ok: false, reason: "handle-consecutive-periods" });
  });

  it("with a handle another Member has: reports handle-taken", async () => {
    await invite(invitedEmail);
    const otherEmail = `other-${runId}@example.com`;
    await invite(otherEmail);
    await operations.accounts.signUp(visitor, {
      email: otherEmail,
      password,
      handle,
    });

    const result = await operations.accounts.signUp(visitor, {
      email: invitedEmail,
      password,
      handle: handle.toUpperCase(),
    });

    expect(result).toEqual({ ok: false, reason: "handle-taken" });
    await db.delete(member).where(eq(member.email, otherEmail));
    await db.delete(allowlistEntry).where(eq(allowlistEntry.email, otherEmail));
    await deleteMessagesTo(otherEmail);
  });

  it("with a short password: reports password-too-short", async () => {
    await invite(invitedEmail);

    const result = await operations.accounts.signUp(visitor, {
      email: invitedEmail,
      password: "too short",
      handle,
    });

    expect(result).toEqual({ ok: false, reason: "password-too-short" });
  });

  it("with an email that already has an account: looks like success, and warns the owner by email", async () => {
    await invite(invitedEmail);
    await operations.accounts.signUp(visitor, { email: invitedEmail, password, handle });
    await deleteMessagesTo(invitedEmail);

    const result = await operations.accounts.signUp(visitor, {
      email: invitedEmail,
      password: "a different long password",
      handle: `${handle}_2`,
    });

    expect(result.ok).toBe(true);
    expect(
      await textOfEmailTo(invitedEmail, "Someone tried to sign up"),
    ).toContain("/login");
    const rows = await db.select().from(member).where(eq(member.email, invitedEmail));
    expect(rows).toHaveLength(1);
  });

  it("as a logged-in Member: refused, since signing up is for Visitors", async () => {
    await expect(
      operations.accounts.signUp(memberActor(1), {
        email: invitedEmail,
        password,
        handle,
      }),
    ).rejects.toThrow(PermissionRefusedError);
  });
});
