/**
 * Mailer adapter for production: sends through Resend's HTTP API
 * (https://resend.com/docs/api-reference/emails/send-email).
 *
 * Called directly with `fetch` rather than through Resend's SDK: one
 * request does all we need, and it keeps a dependency out of the project.
 * The sending domain and API key are set up in the first deploy (ticket 8);
 * until then this adapter is covered only by unit tests with a fake network.
 */
import {
  type MailMessage,
  type MailSender,
  type Mailer,
  postJson,
  readMessageId,
} from "./mailer";

const resendSendUrl = "https://api.resend.com/emails";

export interface ResendMailerOptions {
  /** A Resend API key (`re_...`), from the RESEND_API_KEY setting. */
  apiKey: string;
  from: MailSender;
  /** Injected so tests can replace the network; defaults to the real one. */
  fetch?: typeof fetch;
}

/** Builds a Mailer that delivers real email through Resend. */
export function createResendMailer({
  apiKey,
  from,
  fetch: fetchFunction = globalThis.fetch,
}: ResendMailerOptions): Mailer {
  return {
    async send(message: MailMessage) {
      const reply = await postJson(
        fetchFunction,
        "Resend",
        resendSendUrl,
        {
          from: `${from.name} <${from.address}>`,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        },
        { Authorization: `Bearer ${apiKey}` },
      );
      return { id: readMessageId(reply, "Resend", "id") };
    },
  };
}
