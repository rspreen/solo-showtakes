/**
 * Gives a Member the Admin role, by login email:
 *
 *   pnpm admin:promote you@example.com
 *
 * This is how the first Admin is made, since no one can do it through the
 * site until an Admin exists. It runs against the database in DATABASE_URL
 * (`.env` locally), so it can also be run against production with that
 * database's settings.
 *
 * Like every script, it acts as the operator (ADR 0007) and goes through
 * the same operation the admin screens will use (`operations.roles.grant`),
 * so the rules and the log line are the same. The Member must have signed
 * up first.
 *
 * Run with tsx (a dev tool that runs TypeScript directly, understanding the
 * `@/` imports), wired up in package.json.
 */
import "dotenv/config";
import { userInfo } from "node:os";
import { operator } from "@/core/shared/operator";
import { createServicesFromEnvironment } from "@/wiring/create-services-from-environment";

/** What to print for each outcome, by result. */
const outcomeMessages = {
  granted: (email: string) => `${email} is now an Admin.`,
  "already-held": (email: string) => `${email} is already an Admin; nothing changed.`,
  "no-such-member": (email: string) =>
    `No Member has the email ${email}. They must sign up first.`,
} as const;

/** Promotes the Member named on the command line; returns the exit code. */
async function main(argumentsGiven: string[]): Promise<number> {
  const [email, ...extra] = argumentsGiven;
  if (!email || extra.length > 0) {
    console.error("Usage: pnpm admin:promote <email>");
    return 2;
  }

  const services = createServicesFromEnvironment();
  try {
    // Log lines name the computer account that ran the script.
    const logger = services.logger.child({ operatorName: userInfo().username });
    const result = await services
      .operationsFor(logger)
      .roles.grant(operator, email, "admin");

    if (result.ok) {
      console.log(outcomeMessages.granted(email));
      return 0;
    }
    console.error(outcomeMessages[result.reason](email));
    // Already an Admin is not a failure: the goal is met.
    return result.reason === "already-held" ? 0 : 1;
  } finally {
    await services.close();
  }
}

process.exitCode = await main(process.argv.slice(2));
