/**
 * Runs the real `pnpm allowlist:add` command, as a separate process, against
 * the throwaway test database, and checks the email landed on the allowlist,
 * normalised as signup expects.
 */
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, inject, it } from "vitest";
import { isEmailOnAllowlist } from "@/core/people/allowlist.operations";
import { allowlistEntry } from "@/core/people/schema";
import { createTestServices } from "@/wiring/testing/test-services";

const run = promisify(execFile);
const services = createTestServices();
const { db } = services;
const email = `invited-${randomUUID().slice(0, 8)}@example.com`;

/** Runs the allowlist script with `args`, against the test database. */
async function addToAllowlist(...args: string[]) {
  try {
    const { stdout, stderr } = await run("pnpm", ["--silent", "allowlist:add", ...args], {
      env: {
        ...process.env,
        DATABASE_URL: inject("testDatabaseUrl"),
        // Set (to nothing) so the script's .env does not add a log file.
        LOG_FILE: "",
      },
    });
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    // execFile rejects when the exit code is not 0; keep its output.
    const failed = error as { code: number; stdout: string; stderr: string };
    return { exitCode: failed.code, stdout: failed.stdout, stderr: failed.stderr };
  }
}

afterAll(async () => {
  await db.delete(allowlistEntry).where(eq(allowlistEntry.email, email));
  await services.close();
});

describe("pnpm allowlist:add", () => {
  it("adds the email, normalised, and says so", async () => {
    // Typed with capitals and spaces, as someone might paste it.
    const outcome = await addToAllowlist(`  ${email.toUpperCase()} `);

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain("can now sign up");
    // The log line, on standard output, names who ran the script.
    expect(outcome.stdout).toContain('"event":"allowlist.email.added"');
    expect(outcome.stdout).toContain('"operatorName"');
    expect(await isEmailOnAllowlist(db, email)).toBe(true);
  });

  it("succeeds without change for an email already listed", async () => {
    const outcome = await addToAllowlist(email);

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stderr).toContain("already on the allowlist");
  });

  it("prints usage when the argument is missing or not an email", async () => {
    for (const args of [[], ["not-an-email"], [email, "extra"]]) {
      const outcome = await addToAllowlist(...args);

      expect(outcome.exitCode).toBe(2);
      expect(outcome.stderr).toContain("Usage: pnpm allowlist:add <email>");
    }
  });
});
