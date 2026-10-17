/**
 * Sample integration test: proves the migrated test database works and shows
 * the pattern later tests follow (create your own data, clean it up).
 *
 * The allowlist rules themselves (normalising emails, refusing signup) belong
 * to ticket 5 and will be tested through the operations layer there.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { allowlistEntry } from "./schema";
import { connectToTestDatabase } from "./testing/test-database";

const connection = connectToTestDatabase();
const { db } = connection;

// A unique email per run, so parallel test files can never collide.
const email = `sample-${randomUUID()}@example.com`;

afterEach(async () => {
  await db.delete(allowlistEntry).where(eq(allowlistEntry.email, email));
});

afterAll(() => connection.close());

describe("allowlist_entry table", () => {
  it("stores an email and stamps when it was added", async () => {
    await db.insert(allowlistEntry).values({ email });

    const rows = await db
      .select()
      .from(allowlistEntry)
      .where(eq(allowlistEntry.email, email));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("rejects the same email twice", async () => {
    await db.insert(allowlistEntry).values({ email });

    await expect(db.insert(allowlistEntry).values({ email })).rejects.toThrow();
  });
});
