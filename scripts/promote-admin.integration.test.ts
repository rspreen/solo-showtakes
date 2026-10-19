/**
 * The "Roles and the first Admin" ticket's done-when for the script: runs
 * the real `pnpm admin:promote` command, as a separate process, against the
 * throwaway test database, and checks the Member became an Admin.
 */
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, inject, it } from "vitest";
import { member } from "@/core/people/schema";
import { memberActorFor } from "@/core/people/roles.operations";
import { createTestServices } from "@/wiring/testing/test-services";

const run = promisify(execFile);
const services = createTestServices();
const { db } = services;
const email = `promoted-${randomUUID().slice(0, 8)}@example.com`;

/** Runs the promote script with `args`, against the test database. */
async function promote(...args: string[]) {
  try {
    const { stdout, stderr } = await run("pnpm", ["--silent", "admin:promote", ...args], {
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
  await db.delete(member).where(eq(member.email, email));
  await services.close();
});

describe("pnpm admin:promote", () => {
  it("makes a signed-up Member an Admin, and says so", async () => {
    const [created] = await db
      .insert(member)
      .values({ email, handle: `promoted_${email.slice(9, 17)}`, displayName: "p" })
      .returning({ id: member.id });

    const outcome = await promote(email);

    expect(outcome.exitCode).toBe(0);
    expect(outcome.stdout).toContain(`${email} is now an Admin.`);
    // The log line, on standard output, names who ran the script.
    expect(outcome.stdout).toContain('"event":"roles.role.granted"');
    expect(outcome.stdout).toContain('"operatorName"');
    expect((await memberActorFor(db, created!.id)).roles).toEqual(["admin"]);
  });

  it("explains, and fails, for an email no Member has", async () => {
    const outcome = await promote(`nobody-${email}`);

    expect(outcome.exitCode).toBe(1);
    expect(outcome.stderr).toContain("must sign up first");
  });

  it("prints usage when no email is given", async () => {
    const outcome = await promote();

    expect(outcome.exitCode).toBe(2);
    expect(outcome.stderr).toContain("Usage: pnpm admin:promote <email>");
  });
});
