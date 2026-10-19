/**
 * Test helper: an output stream for the Pino logger (pino-logger.ts) that
 * keeps what was written in memory, so tests can read the real log lines,
 * exactly as they would appear in the log file.
 *
 *   const output = createCapturedOutput();
 *   const logger = createPinoLogger({ level: "info", outputs: [output.stream] });
 *   ...
 *   expect(output.lines()).toContainEqual(expect.objectContaining({ ... }));
 */
import { type DestinationStream } from "pino";

/** Captured log output, as raw text and as parsed lines. */
export interface CapturedOutput {
  /** Pass this to `createPinoLogger` as an output. */
  stream: DestinationStream;
  /** Everything written so far, exactly as written. */
  text(): string;
  /** Each line written so far, parsed from JSON. */
  lines(): Record<string, unknown>[];
}

/** Builds an empty captured output. */
export function createCapturedOutput(): CapturedOutput {
  const chunks: string[] = [];
  return {
    stream: { write: (chunk: string) => void chunks.push(chunk) },
    text: () => chunks.join(""),
    lines: () =>
      chunks
        .join("")
        .split("\n")
        .filter((line) => line.length > 0)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}
