/**
 * Unit tests for the permission checks every operation relies on.
 * No database: these are pure functions of the Actor.
 */
import { describe, expect, it } from "vitest";
import { memberActor, visitor } from "./actor";
import {
  PermissionRefusedError,
  requireMember,
  requireRole,
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
});
