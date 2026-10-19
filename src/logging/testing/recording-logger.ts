/**
 * Test helper: a Logger that keeps every event in memory instead of
 * writing it anywhere, so tests can check what was logged.
 *
 *   const logger = createRecordingLogger();
 *   ... run an operation with `logger` ...
 *   expect(logger.entries).toContainEqual(
 *     expect.objectContaining({ event: "accounts.signup.refused" }),
 *   );
 *
 * Child loggers record into the same list, with their fields merged in, as
 * a real child logger would write them.
 */
import { type LogEvent, type LogFields, type Logger } from "@/core/shared/logger";

/** One recorded event. */
export interface LogEntry {
  level: "info" | "warn" | "error";
  event: LogEvent;
  fields: LogFields;
}

/** A Logger whose `entries` list holds every event logged through it. */
export interface RecordingLogger extends Logger {
  readonly entries: LogEntry[];
}

/** Builds an empty recording logger. */
export function createRecordingLogger(): RecordingLogger {
  const entries: LogEntry[] = [];

  function loggerWith(inheritedFields: LogFields): Logger {
    const record =
      (level: LogEntry["level"]) => (event: LogEvent, fields: LogFields = {}) => {
        entries.push({ level, event, fields: { ...inheritedFields, ...fields } });
      };
    return {
      info: record("info"),
      warn: record("warn"),
      error: record("error"),
      child: (fields) => loggerWith({ ...inheritedFields, ...fields }),
    };
  }

  return { ...loggerWith({}), entries };
}
