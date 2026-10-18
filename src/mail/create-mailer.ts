/**
 * Chooses the Mailer adapter from the environment (`.env` locally, the
 * host's settings in production).
 *
 * MAIL_PROVIDER must be set explicitly; there is no default. That way a
 * missing setting fails at startup instead of quietly picking an adapter,
 * and development only reaches Resend if someone deliberately sets
 * `MAIL_PROVIDER=resend`. `.env.example` sets `mailpit`.
 */
import { type Mailer, type MailSender } from "./mailer";
import { createMailpitMailer } from "./mailpit-mailer";
import { createResendMailer } from "./resend-mailer";

/** The display name on every email the site sends. */
const senderName = "Showtakes";

/** The environment settings this module reads. */
type MailSettingName =
  | "MAIL_PROVIDER"
  | "MAIL_FROM"
  | "MAILPIT_URL"
  | "RESEND_API_KEY";

/**
 * Settings by name, shaped like `process.env` so it can be passed directly;
 * tests pass a plain object instead.
 */
export type MailEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Builds the Mailer named by MAIL_PROVIDER (`mailpit` or `resend`), failing
 * with a descriptive message if a required setting is missing. `fetch` is
 * passed to the adapter; tests replace it to see where mail would go.
 */
export function createMailerFromEnvironment(
  environment: MailEnvironment = process.env,
  fetchFunction: typeof fetch = globalThis.fetch,
): Mailer {
  const provider = environment.MAIL_PROVIDER;
  if (provider !== "mailpit" && provider !== "resend") {
    throw new Error(
      `MAIL_PROVIDER must be "mailpit" or "resend", but is ${JSON.stringify(provider)}. ` +
        "Locally, copy it from .env.example.",
    );
  }

  const from: MailSender = {
    name: senderName,
    address: requireSetting(environment, "MAIL_FROM"),
  };

  switch (provider) {
    case "mailpit":
      return createMailpitMailer({
        baseUrl: requireSetting(environment, "MAILPIT_URL"),
        from,
        fetch: fetchFunction,
      });
    case "resend":
      return createResendMailer({
        apiKey: requireSetting(environment, "RESEND_API_KEY"),
        from,
        fetch: fetchFunction,
      });
  }
}

/** Returns the named setting, or throws if it is missing or empty. */
function requireSetting(
  environment: MailEnvironment,
  name: MailSettingName,
): string {
  const value = environment[name];
  if (!value) {
    throw new Error(
      `${name} is not set, but MAIL_PROVIDER=${environment.MAIL_PROVIDER ?? "(unset)"} needs it. ` +
        "Locally, copy it from .env.example.",
    );
  }
  return value;
}
