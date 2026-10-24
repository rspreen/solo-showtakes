/**
 * Better Auth configuration: logins, sessions, email verification, and
 * password reset (ADR 0001, ADR 0005).
 *
 * Better Auth is a library that keeps Members and their logins in our own
 * database (the tables in src/core/people/schema.ts) and serves its own
 * HTTP endpoints under /api/auth (src/app/api/auth/[...all]/route.ts).
 * Login, logout, verification, and reset pages call those endpoints from
 * the browser (src/auth/client.ts). Signup does not: it goes through our
 * signup operation, which applies our rules first and then reaches Better
 * Auth through `member-account-creator.ts`.
 *
 * `createAuth` receives everything it needs (database, Mailer, Logger,
 * settings), so the web app and tests build it the same way (src/wiring/).
 * Login outcomes are logged by `logging-hook.ts`, and Better Auth's own
 * messages go to the same Logger (ADR 0006).
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { isEmailOnAllowlist } from "@/core/people/allowlist.operations";
import {
  maximumPasswordLength,
  minimumPasswordLength,
} from "@/core/people/password";
import { account, member, session, verification } from "@/core/people/schema";
import { type Logger } from "@/core/shared/logger";
import { type Database } from "@/db/client";
import { type Mailer } from "@/mail/mailer";
import { type RateLimiter } from "@/rate-limit/rate-limiter";
import {
  existingAccountEmail,
  passwordResetEmail,
  verificationEmail,
} from "./emails";
import { createAuthLoggingHook } from "./logging-hook";

const oneDayInSeconds = 60 * 60 * 24;

export interface AuthSettings {
  db: Database;
  mailer: Mailer;
  /** Receives login outcomes and Better Auth's own messages. */
  logger: Logger;
  /**
   * The site's public address, such as `https://showtakes.com`. Links in
   * emails point here, and Better Auth only accepts requests from it.
   */
  baseUrl: string;
  /** Secret for signing tokens and cookies, from BETTER_AUTH_SECRET. */
  secret: string;
  /** Where request counts are kept, or null to switch rate limiting off. */
  rateLimiter: RateLimiter | null;
}

/** Builds the Better Auth instance for the given database and Mailer. */
export function createAuth({
  db,
  mailer,
  logger,
  baseUrl,
  secret,
  rateLimiter,
}: AuthSettings) {
  return betterAuth({
    baseURL: baseUrl,
    secret,

    // Better Auth's own messages (such as "Invalid password", with no
    // request details) become `auth.library.message` lines in our log.
    // Its "debug" and "info" are both our `info`.
    logger: {
      log: (level, message, ...details) => {
        const fields = { message, details: details.length > 0 ? details : undefined };
        if (level === "error") logger.error("auth.library.message", fields);
        else if (level === "warn") logger.warn("auth.library.message", fields);
        else logger.info("auth.library.message", fields);
      },
    },
    hooks: { after: createAuthLoggingHook(logger) },

    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { member, session, account, verification },
    }),
    // Let the database generate integer ids (ADR 0003).
    advanced: { database: { generateId: "serial" } },

    // Better Auth calls its user "user"; ours is "member" (CONTEXT.md).
    // `fields` maps Better Auth's property names to ours.
    user: {
      modelName: "member",
      fields: { name: "displayName" },
      additionalFields: {
        handle: { type: "string", required: true, input: true },
      },
      // The guard nothing can bypass: Better Auth runs this before creating
      // any Member, however the request arrived. The signup operation has
      // already checked, so this only fires if something skipped it.
      validateUserInfo: async ({ user }) => {
        if (typeof user.email === "string" && (await isEmailOnAllowlist(db, user.email))) {
          return;
        }
        return { error: "not_invited" };
      },
    },
    session: {
      fields: { userId: "memberId" },
      // Logins last 90 days from last use, renewed at most once a day.
      expiresIn: 90 * oneDayInSeconds,
      updateAge: oneDayInSeconds,
    },
    account: { fields: { userId: "memberId" } },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: minimumPasswordLength,
      maxPasswordLength: maximumPasswordLength,
      // A reset logs out every other browser, in case the password leaked.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await mailer.send(passwordResetEmail(user.email, url));
      },
      onExistingUserSignUp: async ({ user }) => {
        await mailer.send(
          existingAccountEmail(user.email, new URL("/login", baseUrl).toString()),
        );
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.send(verificationEmail(user.email, url));
      },
      // An unverified Member who tries to log in gets a fresh link, which
      // covers a lost or expired first email.
      sendOnSignIn: true,
      // Clicking the link logs the new Member straight in.
      autoSignInAfterVerification: true,
    },

    // Requests to these endpoints are limited per IP address and path,
    // with counts in our database (src/rate-limit/) rather than Better
    // Auth's default of each server's memory. The limits are Better Auth's
    // own defaults:
    // - /sign-in/*: 3 per 10 seconds.
    // - /request-password-reset, /send-verification-email: 3 per minute.
    // - everything else under /api/auth: 100 per 10 seconds.
    // A refused request gets HTTP 429, logged by the route handler
    // (src/app/api/auth/[...all]/route.ts).
    rateLimit: rateLimiter
      ? { enabled: true, customStorage: rateLimiter }
      : { enabled: false },

    // Signup must go through the signup operation (our rules), so Better
    // Auth's own public signup endpoint is switched off. Server code can
    // still call it directly, which is how the operation reaches it.
    disabledPaths: ["/sign-up/email"],
  });
}

/** The configured Better Auth instance. */
export type Auth = ReturnType<typeof createAuth>;
