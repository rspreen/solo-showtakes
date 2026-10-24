/**
 * Integration tests for the database-backed rate limiter (rate-limiter.ts),
 * against the throwaway test database. Time passing is simulated by moving
 * a counter's window start into the past, so no test has to wait.
 */
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createTestServices } from "@/wiring/testing/test-services";
import { createRateLimiter } from "./rate-limiter";
import { rateLimitCounter } from "./schema";

const services = createTestServices();
const { db } = services;
const limiter = createRateLimiter(db);
const threePerMinute = { window: 60, max: 3 };

/** A key no other test uses. */
function uniqueKey(): string {
  return `test|${randomUUID()}`;
}

/** Makes `key`'s window look as if it began `seconds` ago. */
async function startWindowSecondsAgo(key: string, seconds: number): Promise<void> {
  await db
    .update(rateLimitCounter)
    .set({ windowStartedAt: sql`now() - make_interval(secs => ${seconds})` })
    .where(eq(rateLimitCounter.key, key));
}

afterAll(async () => {
  await services.close();
});

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses with the seconds left", async () => {
    const key = uniqueKey();

    for (let attempt = 1; attempt <= 3; attempt++) {
      expect(await limiter.consume(key, threePerMinute)).toEqual({
        allowed: true,
        retryAfter: null,
      });
    }
    const refused = await limiter.consume(key, threePerMinute);

    expect(refused.allowed).toBe(false);
    expect(refused.retryAfter).toBeGreaterThan(55);
    expect(refused.retryAfter).toBeLessThanOrEqual(60);
  });

  it("allows again once the window has ended", async () => {
    const key = uniqueKey();
    for (let attempt = 1; attempt <= 4; attempt++) await limiter.consume(key, threePerMinute);

    await startWindowSecondsAgo(key, 61);

    expect((await limiter.consume(key, threePerMinute)).allowed).toBe(true);
  });

  it("keeps refusing until the window ends, however often it is asked", async () => {
    const key = uniqueKey();
    for (let attempt = 1; attempt <= 10; attempt++) await limiter.consume(key, threePerMinute);

    await startWindowSecondsAgo(key, 50);
    const refused = await limiter.consume(key, threePerMinute);

    expect(refused.allowed).toBe(false);
    expect(refused.retryAfter).toBeLessThanOrEqual(10);
  });

  it("counts each key separately", async () => {
    const busyKey = uniqueKey();
    for (let attempt = 1; attempt <= 4; attempt++) await limiter.consume(busyKey, threePerMinute);

    expect((await limiter.consume(uniqueKey(), threePerMinute)).allowed).toBe(true);
  });

  it("lets exactly the limit through when requests arrive together", async () => {
    const key = uniqueKey();
    const rule = { window: 60, max: 5 };

    const decisions = await Promise.all(
      Array.from({ length: 20 }, () => limiter.consume(key, rule)),
    );

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(5);
  });

  it("deletes counters older than an hour when a new window opens", async () => {
    const oldKey = uniqueKey();
    await limiter.consume(oldKey, threePerMinute);
    await startWindowSecondsAgo(oldKey, 2 * 60 * 60);

    await limiter.consume(uniqueKey(), threePerMinute);

    const remaining = await db
      .select()
      .from(rateLimitCounter)
      .where(eq(rateLimitCounter.key, oldKey));
    expect(remaining).toEqual([]);
  });

  it.each([
    [{ window: 0, max: 3 }, /window/],
    [{ window: 2 * 60 * 60, max: 3 }, /window/],
    [{ window: 1.5, max: 3 }, /window/],
    [{ window: 60, max: 0 }, /max/],
  ])("refuses the unworkable rule %j", async (rule, message) => {
    await expect(limiter.consume(uniqueKey(), rule)).rejects.toThrow(message);
  });
});
