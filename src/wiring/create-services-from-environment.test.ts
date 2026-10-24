/**
 * Unit tests for reading the RATE_LIMITING setting
 * (create-services-from-environment.ts).
 */
import { describe, expect, it } from "vitest";
import { rateLimitingFrom } from "./create-services-from-environment";

describe("rateLimitingFrom", () => {
  it.each<[string | undefined, string]>([
    [undefined, "missing, as in production"],
    ["", "blank"],
    ["on", "on"],
  ])("is on when the setting is %j (%s)", (setting) => {
    expect(rateLimitingFrom(setting)).toBe(true);
  });

  it("is off only when the setting says off", () => {
    expect(rateLimitingFrom("off")).toBe(false);
  });

  it.each(["Off", "false", "0", "yes"])("refuses the unknown value %j", (setting) => {
    expect(() => rateLimitingFrom(setting)).toThrow(/RATE_LIMITING must be "on" or "off"/);
  });
});
