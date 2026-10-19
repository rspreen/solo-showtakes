/**
 * The Pino adapter for the Logger interface (src/core/shared/logger.ts):
 * writes each event as one line of JSON (ADR 0006).
 *
 * Pino is a widely used, fast Node.js logging library. A line looks like:
 *
 *   {"level":"warn","time":"2026-10-18T...","event":"auth.login.failed",
 *    "reason":"INVALID_EMAIL_OR_PASSWORD","email":"x@example.com",
 *    "ip":"203.0.113.9","requestId":"..."}
 *
 * Lines go to every stream in `outputs`: in the web app, standard output
 * (which the host collects and, in production, sends on to a log service)
 * plus a file when LOG_FILE is set (create-logger.ts). Writing happens in
 * this process, not in a background thread, because Pino's background
 * "transports" do not suit serverless hosting.
 *
 * Secrets are blanked out of every line by Pino's `redact` setting, wherever
 * they appear, so a password can never reach the log by accident.
 */
import pino, { type DestinationStream, type Level } from "pino";
import { type LogFields, type Logger } from "@/core/shared/logger";

/** The levels LOG_LEVEL may name, quietest last. */
export const logLevels = ["info", "warn", "error"] as const;
export type LogLevel = (typeof logLevels)[number];

/**
 * Field names whose values are always replaced by "[Redacted]". Each is
 * matched at the top level, nested one or two levels down (such as inside
 * `error` or a headers object), and inside the `details` list that holds a
 * library's log arguments.
 */
const secretFieldNames = [
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "secret",
  "cookie",
  "authorization",
];
const redactedPaths = secretFieldNames.flatMap((name) => [
  name,
  `*.${name}`,
  `*.*.${name}`,
  `details[*].${name}`,
  `details[*].*.${name}`,
]);

export interface PinoLoggerSettings {
  /** The quietest level written; lower levels are dropped. */
  level: LogLevel;
  /**
   * Where lines are written, such as standard output and a file. Anything
   * with a `write(line)` method will do, which lets tests capture output.
   */
  outputs: DestinationStream[];
}

/** Builds a Logger that writes JSON lines to every stream in `outputs`. */
export function createPinoLogger({ level, outputs }: PinoLoggerSettings): Logger {
  if (outputs.length === 0) {
    throw new Error("createPinoLogger needs at least one output stream.");
  }
  const pinoLogger = pino(
    {
      level,
      // Name levels in words ("warn") rather than Pino's numbers (40).
      formatters: { level: (label) => ({ level: label }) },
      timestamp: pino.stdTimeFunctions.isoTime,
      // Pino adds the process id and host name by default; they add noise
      // on serverless hosting, where both change constantly.
      base: undefined,
      redact: { paths: redactedPaths },
      // Pino's standard error serializer, so `error` shows its message and
      // stack rather than `{}`.
      serializers: { error: pino.stdSerializers.err },
    },
    pino.multistream(
      outputs.map((stream) => ({ stream, level: level as Level })),
    ),
  );
  return wrap(pinoLogger);
}

/** Adapts a Pino logger to our Logger interface. */
function wrap(pinoLogger: pino.Logger): Logger {
  return {
    info: (event, fields) => pinoLogger.info(lineFor(event, fields)),
    warn: (event, fields) => pinoLogger.warn(lineFor(event, fields)),
    error: (event, fields) => pinoLogger.error(lineFor(event, fields)),
    child: (fields) => wrap(pinoLogger.child(fields)),
  };
}

/** The object Pino writes for one event: its name first, then its fields. */
function lineFor(event: string, fields: LogFields = {}): Record<string, unknown> {
  return { event, ...fields };
}
