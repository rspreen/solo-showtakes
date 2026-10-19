/**
 * Builds the site's Logger from the environment (`.env` locally, the host's
 * settings in production). Called once per server process by
 * src/server/services.ts.
 *
 * - LOG_LEVEL (required): the quietest level written, `info`, `warn`, or
 *   `error`. Required rather than defaulted, like MAIL_PROVIDER, so each
 *   environment states what it records. `.env.example` sets `info`.
 * - LOG_FILE (optional): a file that also receives every line, such as
 *   `logs/showtakes.log` in development (the `logs/` folder is not
 *   committed). Production leaves it unset: the host's disk is temporary,
 *   so production logs travel from standard output to a log service
 *   instead (ADR 0006).
 */
import pino, { type DestinationStream } from "pino";
import { type Logger } from "@/core/shared/logger";
import { type LogLevel, createPinoLogger, logLevels } from "./pino-logger";

/**
 * Settings by name, shaped like `process.env` so it can be passed directly;
 * tests pass a plain object instead.
 */
export type LogEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Builds a Logger writing to standard output, plus LOG_FILE when set.
 * Throws with a descriptive message if LOG_LEVEL is missing or unknown.
 */
export function createLoggerFromEnvironment(
  environment: LogEnvironment = process.env,
): Logger {
  const outputs: DestinationStream[] = [process.stdout];
  if (environment.LOG_FILE) {
    // Written synchronously: simpler, and fine for a development file.
    // `mkdir` creates the folder on first use.
    outputs.push(
      pino.destination({ dest: environment.LOG_FILE, mkdir: true, sync: true }),
    );
  }
  return createPinoLogger({ level: logLevelFrom(environment), outputs });
}

/** Reads and checks LOG_LEVEL. */
export function logLevelFrom(environment: LogEnvironment): LogLevel {
  const level = environment.LOG_LEVEL;
  const knownLevel = logLevels.find((known) => known === level);
  if (!knownLevel) {
    throw new Error(
      `LOG_LEVEL must be one of ${logLevels.join(", ")}, but is ${JSON.stringify(level)}. ` +
        "Locally, copy it from .env.example.",
    );
  }
  return knownLevel;
}
