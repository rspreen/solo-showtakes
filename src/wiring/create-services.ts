/**
 * The composition root: builds every long-lived service the site runs on
 * and connects them, in one place.
 *
 *   database ──┬──────────────────────────────► operations (src/core)
 *              └─► Better Auth (src/auth) ──► account creator ─┘
 *   Mailer (src/mail) ─┘          ▲                            ▲
 *   Logger (src/logging) ─────────┴── per request (child) ─────┘
 *
 * The web app calls this once per server process (src/server/services.ts,
 * from environment settings); integration tests call it with their
 * throwaway database (./testing/test-services.ts). The operations are the
 * exception to "once per process": `operationsFor` builds them per request,
 * around a Logger carrying that request's details (ADR 0006). Because both build the
 * site the same way, tests exercise the real wiring. Nothing else in the
 * codebase constructs these services.
 */
import { createAuth } from "@/auth/auth";
import { createMemberAccountCreator } from "@/auth/member-account-creator";
import { type Operations, createOperations } from "@/core/operations";
import { type Logger } from "@/core/shared/logger";
import { createDatabase } from "@/db/client";
import { type Mailer } from "@/mail/mailer";

export interface ServiceSettings {
  databaseUrl: string;
  mailer: Mailer;
  /** The process-wide Logger; requests log through children of it. */
  logger: Logger;
  /** The site's public address; see AuthSettings.baseUrl. */
  baseUrl: string;
  authSecret: string;
}

/** Builds and connects the database, Better Auth, and the operations. */
export function createServices({
  databaseUrl,
  mailer,
  logger,
  baseUrl,
  authSecret,
}: ServiceSettings) {
  const connection = createDatabase(databaseUrl);
  const { db } = connection;
  const auth = createAuth({ db, mailer, logger, baseUrl, secret: authSecret });
  const accountCreator = createMemberAccountCreator(auth);

  return {
    db,
    mailer,
    logger,
    auth,
    /**
     * Builds the operations around `requestLogger`, normally a child of
     * `logger` carrying the current request's IP address and id.
     */
    operationsFor(requestLogger: Logger): Operations {
      return createOperations({ db, accountCreator, logger: requestLogger });
    },
    /** Closes the database pool. Call once when finished (tests). */
    close: connection.close,
  };
}

export type Services = ReturnType<typeof createServices>;
