/**
 * Unit tests for the permission checks every operation relies on.
 * No database: these are pure functions of the Actor.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { memberActor, visitor } from "./actor";
import { operator } from "./operator";
import {
  PermissionRefusedError,
  requireMember,
  requireRole,
  requireVisitor,
} from "./permissions";

/** Runs `check` and returns the PermissionRefusedError it throws. */
function refusalFrom(check: () => void): PermissionRefusedError {
  try {
    check();
  } catch (error) {
    if (error instanceof PermissionRefusedError) return error;
    throw error;
  }
  throw new Error("Expected a PermissionRefusedError, but nothing was thrown.");
}

describe("requireMember", () => {
  it("refuses a Visitor, asking them to log in", () => {
    const refusal = refusalFrom(() => requireMember(visitor, "rate"));
    expect(refusal.reason).toBe("login-required");
  });

  it("allows any Member", () => {
    expect(() => requireMember(memberActor(1), "rate")).not.toThrow();
  });

  it("refuses the operator, which has no Member identity to act as", () => {
    const refusal = refusalFrom(() => requireMember(operator, "rate"));
    expect(refusal.reason).toBe("not-permitted");
  });
});

describe("requireVisitor", () => {
  it("refuses a logged-in Member", () => {
    const refusal = refusalFrom(() => requireVisitor(memberActor(1), "sign up"));
    expect(refusal.reason).toBe("not-permitted");
  });

  it("allows a Visitor", () => {
    expect(() => requireVisitor(visitor, "sign up")).not.toThrow();
  });

  it("refuses the operator", () => {
    const refusal = refusalFrom(() => requireVisitor(operator, "sign up"));
    expect(refusal.reason).toBe("not-permitted");
  });
});

describe("requireRole", () => {
  it("refuses a Visitor, asking them to log in", () => {
    const refusal = refusalFrom(() => requireRole(visitor, "admin", "act"));
    expect(refusal.reason).toBe("login-required");
  });

  it("refuses a Member without the role", () => {
    const curator = memberActor(1, ["curator"]);
    const refusal = refusalFrom(() => requireRole(curator, "admin", "act"));
    expect(refusal.reason).toBe("not-permitted");
    expect(refusal.message).toContain("Member 1");
  });

  it("allows a Member with the role", () => {
    const admin = memberActor(1, ["curator", "admin"]);
    expect(() => requireRole(admin, "admin", "act")).not.toThrow();
  });

  it("allows the operator, whatever the role", () => {
    expect(() => requireRole(operator, "admin", "act")).not.toThrow();
    expect(() => requireRole(operator, "curator", "act")).not.toThrow();
  });
});

describe("the operator inside the web server", () => {
  // Next.js sets NEXT_RUNTIME in the web server; scripts and tests lack it.
  afterEach(() => vi.unstubAllEnvs());

  it("is refused by every check, so web code can never act as it", () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    for (const check of [
      () => requireRole(operator, "admin", "act"),
      () => requireMember(operator, "act"),
      () => requireVisitor(operator, "act"),
    ]) {
      const refusal = refusalFrom(check);
      expect(refusal.reason).toBe("not-permitted");
      expect(refusal.message).toContain("inside the web server");
    }
  });

  it("does not affect Members", () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    expect(() => requireRole(memberActor(1, ["admin"]), "admin", "act")).not.toThrow();
  });
});
