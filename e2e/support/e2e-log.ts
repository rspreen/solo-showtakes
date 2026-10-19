/**
 * The browser-test server's log file, and a helper for reading it.
 *
 * playwright.config.ts points the server's LOG_FILE here, so tests can check
 * what the real site logged for a request they made (ADR 0006). The file
 * keeps growing across runs (the `logs/` folder is not committed); tests
 * find their own lines by the unique email each run uses.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Where the browser-test server writes its log, from the repo root. */
export const e2eLogFile = path.join("logs", "e2e.log");

/** Every line in the log file with this `event` and `email`, parsed. */
export function e2eLogLines(event: string, email: string): Record<string, unknown>[] {
  if (!existsSync(e2eLogFile)) return [];
  return readFileSync(e2eLogFile, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((line) => line.event === event && line.email === email);
}
