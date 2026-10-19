/**
 * Unit tests for the Pino adapter: what a log line contains, which levels
 * are written, and that secrets never reach the output.
 */
import { describe, expect, it } from "vitest";
import { createPinoLogger } from "./pino-logger";
import { createCapturedOutput } from "./testing/captured-output";

/** A logger at `level` writing into a fresh captured output. */
function loggerWithOutput(level: "info" | "warn" | "error" = "info") {
  const output = createCapturedOutput();
  const logger = createPinoLogger({ level, outputs: [output.stream] });
  return { logger, output };
}

describe("createPinoLogger", () => {
  it("writes one JSON line with the level in words, a time, the event, and its fields", () => {
    const { logger, output } = loggerWithOutput();

    logger.warn("accounts.signup.refused", {
      reason: "not-invited",
      email: "someone@example.com",
    });

    const [line] = output.lines();
    expect(line).toMatchObject({
      level: "warn",
      event: "accounts.signup.refused",
      reason: "not-invited",
      email: "someone@example.com",
    });
    expect(typeof line?.time).toBe("string");
    expect(output.text().endsWith("\n")).toBe(true);
  });

  it("adds a child logger's request fields to every line it writes", () => {
    const { logger, output } = loggerWithOutput();

    logger
      .child({ ip: "203.0.113.9", requestId: "request-1" })
      .info("auth.logout.succeeded");

    expect(output.lines()).toEqual([
      expect.objectContaining({
        event: "auth.logout.succeeded",
        ip: "203.0.113.9",
        requestId: "request-1",
      }),
    ]);
  });

  it("at level warn, drops info lines but keeps warn and error", () => {
    const { logger, output } = loggerWithOutput("warn");

    logger.info("auth.login.succeeded");
    logger.warn("auth.login.failed");
    logger.error("request.failed");

    expect(output.lines().map((line) => line.event)).toEqual([
      "auth.login.failed",
      "request.failed",
    ]);
  });

  it("writes to every output", () => {
    const first = createCapturedOutput();
    const second = createCapturedOutput();
    const logger = createPinoLogger({
      level: "info",
      outputs: [first.stream, second.stream],
    });

    logger.info("auth.logout.succeeded");

    expect(first.lines()).toHaveLength(1);
    expect(second.lines()).toHaveLength(1);
  });

  it("redacts passwords, tokens, and cookies wherever they appear", () => {
    const { logger, output } = loggerWithOutput();

    logger.warn("auth.library.message", {
      message: "something went wrong",
      details: [
        { password: "secret-one", user: { newPassword: "secret-two" } },
        { headers: { cookie: "session=secret-three", authorization: "secret-four" } },
      ],
      error: { token: "secret-five" },
    });

    const text = output.text();
    for (const secret of ["secret-one", "secret-two", "secret-three", "secret-four", "secret-five"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain("[Redacted]");
  });

  it("shows an error's message and stack", () => {
    const { logger, output } = loggerWithOutput();

    logger.error("request.failed", { error: new Error("database unreachable") });

    const [line] = output.lines();
    expect(line?.error).toMatchObject({
      type: "Error",
      message: "database unreachable",
      stack: expect.stringContaining("database unreachable"),
    });
  });

  it("refuses to build with no outputs", () => {
    expect(() => createPinoLogger({ level: "info", outputs: [] })).toThrow(
      "at least one output",
    );
  });
});
