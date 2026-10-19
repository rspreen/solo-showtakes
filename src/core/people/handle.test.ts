/**
 * Unit tests for the handle format rules (ticket 5).
 */
import { describe, expect, it } from "vitest";
import { parseHandle } from "./handle";

describe("parseHandle", () => {
  it.each([
    ["ab", "the shortest allowed"],
    ["a".repeat(30), "the longest allowed"],
    ["roger.spreen", "a single period"],
    ["roger_spreen", "underscores"],
    ["r.o.g.e.r", "separated periods"],
    ["9lives", "a leading number"],
    ["roger.", "a trailing period"],
  ])("accepts %j (%s)", (input) => {
    expect(parseHandle(input)).toEqual({ ok: true, value: input });
  });

  it("lowercases and trims what was typed", () => {
    expect(parseHandle("  RogerS ")).toEqual({ ok: true, value: "rogers" });
  });

  it.each([
    ["a", "handle-too-short"],
    ["   a   ", "handle-too-short"],
    ["a".repeat(31), "handle-too-long"],
    ["roger spreen", "handle-invalid-characters"],
    ["roger-spreen", "handle-invalid-characters"],
    ["rogér", "handle-invalid-characters"],
    ["rоger", "handle-invalid-characters"], // Cyrillic "о", a lookalike
    ["@roger", "handle-invalid-characters"],
    [".roger", "handle-must-start-with-letter-or-number"],
    ["_roger", "handle-must-start-with-letter-or-number"],
    ["roger..spreen", "handle-consecutive-periods"],
  ])("rejects %j as %s", (input, problem) => {
    expect(parseHandle(input)).toEqual({ ok: false, reason: problem });
  });
});
