/**
 * Unit tests for reading the log settings from the environment.
 */
import { describe, expect, it } from "vitest";
import { logLevelFrom } from "./create-logger";

describe("logLevelFrom", () => {
  it("accepts each known level", () => {
    expect(logLevelFrom({ LOG_LEVEL: "info" })).toBe("info");
    expect(logLevelFrom({ LOG_LEVEL: "warn" })).toBe("warn");
    expect(logLevelFrom({ LOG_LEVEL: "error" })).toBe("error");
  });

  it("fails with a descriptive message when LOG_LEVEL is missing", () => {
    expect(() => logLevelFrom({})).toThrow(
      "LOG_LEVEL must be one of info, warn, error, but is undefined",
    );
  });

  it("fails when LOG_LEVEL names an unknown level", () => {
    expect(() => logLevelFrom({ LOG_LEVEL: "verbose" })).toThrow('but is "verbose"');
  });
});
