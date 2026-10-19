/**
 * The composition root: builds every long-lived service the site runs on
 * and connects them, in one place.
 *
 *   database ──┬──────────────────────────────► operations (src/core)
 *              └─► Better Auth (src/auth) ──► account creator ─┘
 *   Mailer (src/mail) ─┘
 *
 * The web app calls this once per server process (src/server/services.ts,
 * from environment settings); integration tests call it with their
 * throwaway database (./testing/test-services.ts). Because both build the
 * site the same way, tests exercise the real wiring. Nothing else in the
 * codebase constructs these services.
 */
import { createAuth } from "@/auth/auth";
import { createMemberAccountCreator } from "@/auth/member-account-creator";
import { createOperations } from "@/core/operations";
import { createDatabase } from "@/db/client";
import { type Mailer } from "@/mail/mailer";

export interface ServiceSettings {
  databaseUrl: string;
  mailer: Mailer;
  /** The site's public address; see AuthSettings.baseUrl. */
  baseUrl: string;
  authSecret: string;
}

/** Builds and connects the database, Better Auth, and the operations. */
export function createServices({
  databaseUrl,
  mailer,
  baseUrl,
  authSecret,
}: ServiceSettings) {
  const connection = createDatabase(databaseUrl);
  const { db } = connection;
  const auth = createAuth({ db, mailer, baseUrl, secret: authSecret });
  const operations = createOperations({
    db,
    accountCreator: createMemberAccountCreator(auth),
  });

  return {
    db,
    mailer,
    auth,
    operations,
    /** Closes the database pool. Call once when finished (tests). */
    close: connection.close,
  };
}

export type Services = ReturnType<typeof createServices>;
