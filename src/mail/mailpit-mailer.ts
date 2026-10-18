/**
 * Mailer adapter for development and tests: sends to the local Mailpit
 * inbox (compose.yaml), which keeps every email and delivers none.
 *
 * It uses Mailpit's HTTP send API rather than SMTP, so no mail library is
 * needed. Read what arrived at http://localhost:8025, or from tests through
 * `testing/mailpit-inbox.ts`.
 */
import {
  type MailMessage,
  type MailSender,
  type Mailer,
  postJson,
  readMessageId,
} from "./mailer";

export interface MailpitMailerOptions {
  /** Mailpit's web address, such as `http://localhost:8025`. */
  baseUrl: string;
  from: MailSender;
  /** Injected so tests can replace the network; defaults to the real one. */
  fetch?: typeof fetch;
}

/** Builds a Mailer that delivers into the Mailpit inbox at `baseUrl`. */
export function createMailpitMailer({
  baseUrl,
  from,
  fetch: fetchFunction = globalThis.fetch,
}: MailpitMailerOptions): Mailer {
  const sendUrl = new URL("/api/v1/send", baseUrl).toString();

  return {
    async send(message: MailMessage) {
      const reply = await postJson(fetchFunction, "Mailpit", sendUrl, {
        From: { Name: from.name, Email: from.address },
        To: [{ Email: message.to }],
        Subject: message.subject,
        Text: message.text,
        HTML: message.html,
      });
      return { id: readMessageId(reply, "Mailpit", "ID") };
    },
  };
}
