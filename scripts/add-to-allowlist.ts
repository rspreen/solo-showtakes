/**
 * Puts an email on the invite allowlist, so that person can sign up:
 *
 *   pnpm allowlist:add friend@example.com
 *
 * Until the admin screens exist (the "Admin: members and allowlist"
 * ticket), this is how testers are invited. It runs against the database in
 * DATABASE_URL (`.env` locally). To invite someone to production, put the
 * production database's address in front of the command; settings already
 * in the shell take priority over `.env`:
 *
 *   DATABASE_URL='<production address>' pnpm allowlist:add friend@example.com
 *
 * Like every script, it acts as the operator (ADR 0007) and goes through
 * the same operation the admin screen will use (`operations.allowlist.add`),
 * so the email is normalised the same way signup does, and the change is
 * logged. Built the same way as scripts/promote-admin.ts.
 *
 * Run with tsx (a dev tool that runs TypeScript directly, understanding the
 * `@/` imports), wired up in package.json.
 */
import "dotenv/config";
import { userInfo } from "node:os";
import { operator } from "@/core/shared/operator";
import { createServicesFromEnvironment } from "@/wiring/create-services-from-environment";

const usage = "Usage: pnpm allowlist:add <email>";

/** Adds the email named on the command line; returns the exit code. */
async function main(argumentsGiven: string[]): Promise<number> {
  const [email, ...extra] = argumentsGiven;
  // A light check that catches a forgotten or mistyped argument, such as
  // the arguments in the wrong order; signup checks the email properly.
  if (!email || !email.includes("@") || extra.length > 0) {
    console.error(usage);
    return 2;
  }

  const services = createServicesFromEnvironment();
  try {
    // Log lines name the computer account that ran the script.
    const logger = services.logger.child({ operatorName: userInfo().username });
    const result = await services.operationsFor(logger).allowlist.add(operator, email);

    if (result.ok) {
      console.log(`${email} is on the allowlist and can now sign up.`);
      return 0;
    }
    // Already listed is not a failure: the goal is met.
    console.error(`${email} was already on the allowlist; nothing changed.`);
    return 0;
  } finally {
    await services.close();
  }
}

process.exitCode = await main(process.argv.slice(2));
