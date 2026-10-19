/**
 * Integration tests for roles, against the throwaway test database. Each
 * test reads as a scenario: as some Actor, grant a role, expect an outcome.
 *
 * The last scenario is the "Roles and the first Admin" ticket's done-when
 * for role checks: a Member refused an Admin-only operation can do it once
 * they are made an Admin, with their roles read from the database the way
 * every web request reads them (src/server/actor.ts).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createTestServices } from "@/wiring/testing/test-services";
import { memberActor, visitor } from "../shared/actor";
import { operator } from "../shared/operator";
import { PermissionRefusedError } from "../shared/permissions";
import { allowlistEntry, member, memberRole } from "./schema";
import { memberActorFor } from "./roles.operations";

const services = createTestServices();
const { db, operations } = services;

// Unique per run, so parallel test files never collide.
const runId = randomUUID().slice(0, 8);
const email = `role-holder-${runId}@example.com`;
const inviteeEmail = `invitee-${runId}@example.com`;

/** Creates a Member directly in the database and returns their id. */
async function createMember(): Promise<number> {
  const [created] = await db
    .insert(member)
    .values({ email, handle: `holder_${runId}`, displayName: `holder_${runId}` })
    .returning({ id: member.id });
  if (!created) throw new Error("Creating the test Member returned no row.");
  return created.id;
}

afterEach(async () => {
  // Deleting the Member also deletes their roles (ON DELETE CASCADE).
  await db.delete(member).where(eq(member.email, email));
  await db.delete(allowlistEntry).where(eq(allowlistEntry.email, inviteeEmail));
});

afterAll(() => services.close());

describe("roles.grant", () => {
  it("as the operator: makes the Member an Admin, and logs it", async () => {
    const memberId = await createMember();

    const result = await operations.roles.grant(operator, email, "admin");

    expect(result).toEqual({ ok: true, value: undefined });
    expect((await memberActorFor(db, memberId)).roles).toEqual(["admin"]);
    expect(services.logger.entries).toContainEqual({
      level: "info",
      event: "roles.role.granted",
      fields: { role: "admin", email, targetMemberId: memberId },
    });
  });

  it("as an Admin Member: grants the role too", async () => {
    const memberId = await createMember();

    const result = await operations.roles.grant(
      memberActor(999, ["admin"]),
      email,
      "curator",
    );

    expect(result.ok).toBe(true);
    expect((await memberActorFor(db, memberId)).roles).toEqual(["curator"]);
  });

  it("as a Member without the Admin role: refused", async () => {
    await createMember();

    await expect(
      operations.roles.grant(memberActor(999, ["curator"]), email, "admin"),
    ).rejects.toMatchObject({ reason: "not-permitted" });
  });

  it("as a Visitor: refused, asking them to log in", async () => {
    await expect(operations.roles.grant(visitor, email, "admin")).rejects.toThrow(
      PermissionRefusedError,
    );
  });

  it("with an email no Member has: reports no-such-member", async () => {
    const result = await operations.roles.grant(
      operator,
      `nobody-${runId}@example.com`,
      "admin",
    );

    expect(result).toEqual({ ok: false, reason: "no-such-member" });
  });

  it("for a role already held: reports already-held, and still holds it once", async () => {
    const memberId = await createMember();
    await operations.roles.grant(operator, email, "admin");

    const result = await operations.roles.grant(operator, ` ${email.toUpperCase()}`, "admin");

    expect(result).toEqual({ ok: false, reason: "already-held" });
    const rows = await db.select().from(memberRole).where(eq(memberRole.memberId, memberId));
    expect(rows).toHaveLength(1);
  });
});

describe("memberActorFor", () => {
  it("gives a Member with no roles an Actor with none", async () => {
    const memberId = await createMember();

    expect(await memberActorFor(db, memberId)).toEqual(memberActor(memberId, []));
  });

  it("lists both roles, in a fixed order, for a Member holding both", async () => {
    const memberId = await createMember();
    await operations.roles.grant(operator, email, "admin");
    await operations.roles.grant(operator, email, "curator");

    expect((await memberActorFor(db, memberId)).roles).toEqual(["curator", "admin"]);
  });
});

describe("role checks use the roles in the database", () => {
  it("a Member refused an Admin-only operation can do it once made an Admin", async () => {
    const memberId = await createMember();

    const before = await memberActorFor(db, memberId);
    await expect(operations.allowlist.add(before, inviteeEmail)).rejects.toMatchObject({
      reason: "not-permitted",
    });

    await operations.roles.grant(operator, email, "admin");

    const after = await memberActorFor(db, memberId);
    expect(await operations.allowlist.add(after, inviteeEmail)).toEqual({
      ok: true,
      value: undefined,
    });
  });
});
