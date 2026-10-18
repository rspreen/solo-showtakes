/**
 * Integration tests for the allowlist operations, run against the throwaway
 * test database. Each test reads as a scenario: as some Actor, do something,
 * expect an outcome. Later operation tests follow the same pattern.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { connectToTestDatabase } from "@/db/testing/test-database";
import { createOperations } from "../operations";
import { memberActor, visitor } from "../shared/actor";
import { PermissionRefusedError } from "../shared/permissions";
import { allowlistEntry } from "./schema";

const connection = connectToTestDatabase();
const { db } = connection;
const operations = createOperations({ db });

const memberA = memberActor(1);
const curatorB = memberActor(2, ["curator"]);
const adminC = memberActor(3, ["admin"]);

// A unique email per run, so parallel test files can never collide.
const email = `invitee-${randomUUID()}@example.com`;

/** True when `email` is on the allowlist. */
async function isListed(email: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(allowlistEntry)
    .where(eq(allowlistEntry.email, email));
  return rows.length > 0;
}

afterEach(async () => {
  await db.delete(allowlistEntry).where(eq(allowlistEntry.email, email));
});

afterAll(() => connection.close());

describe("allowlist.add", () => {
  it("as Member A, without the admin role: refused", async () => {
    await expect(operations.allowlist.add(memberA, email)).rejects.toThrow(
      PermissionRefusedError,
    );
    expect(await isListed(email)).toBe(false);
  });

  it("as Curator B: refused, since curating is not administering", async () => {
    await expect(operations.allowlist.add(curatorB, email)).rejects.toThrow(
      PermissionRefusedError,
    );
  });

  it("as a Visitor: refused, asking them to log in", async () => {
    await expect(operations.allowlist.add(visitor, email)).rejects.toMatchObject(
      { reason: "login-required" },
    );
  });

  it("as Admin C: the email is added", async () => {
    const result = await operations.allowlist.add(adminC, email);

    expect(result.ok).toBe(true);
    expect(await isListed(email)).toBe(true);
  });

  it("as Admin C, adding a listed email again: reports already-listed", async () => {
    await operations.allowlist.add(adminC, email);

    const result = await operations.allowlist.add(adminC, email);

    expect(result).toEqual({ ok: false, reason: "already-listed" });
  });
});
