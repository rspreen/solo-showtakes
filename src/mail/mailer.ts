/**
 * The Mailer interface: how the site sends email, independent of who
 * delivers it.
 *
 * Two adapters implement it:
 * - `mailpit-mailer.ts`: development and tests. Mail goes to the local
 *   Mailpit inbox (compose.yaml) and is never delivered to anyone.
 * - `resend-mailer.ts`: production, through Resend.
 * `create-mailer.ts` picks one from the environment. Code that sends email
 * (signup verification and password reset, ticket 5) receives a Mailer as a
 * dependency and never knows which adapter it has, so tests can check sent
 * mail without a real provider.
 */

/** Who an email is from: a display name and an address. */
export interface MailSender {
  name: string;
  address: string;
}

/** One email to one recipient. `text` is always sent; `html` is optional. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends email. Resolves with the provider's id for the sent message. */
export interface Mailer {
  send(message: MailMessage): Promise<{ id: string }>;
}

/**
 * Thrown when a provider rejects or fails to accept an email. Sending
 * failures are unexpected (a correct page cannot cause them), so they are
 * thrown rather than returned, like permission refusals (ADR 0004).
 */
export class MailSendError extends Error {
  override name = "MailSendError";

  constructor(
    message: string,
    /** The provider's HTTP status, when it answered at all. */
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/**
 * POSTs `body` as JSON to `url` and returns the parsed JSON reply, turning
 * every failure (unreachable, non-2xx status) into a MailSendError that
 * names `providerName`. Shared by both adapters.
 */
export async function postJson(
  fetchFunction: typeof fetch,
  providerName: string,
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchFunction(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new MailSendError(`Could not reach ${providerName} at ${url}.`, undefined, {
      cause: error,
    });
  }
  if (!response.ok) {
    // The reply body usually explains the rejection (bad address, unverified
    // domain, quota), so include it.
    const detail = await response.text().catch(() => "(no response body)");
    throw new MailSendError(
      `${providerName} rejected the email with status ${response.status}: ${detail}`,
      response.status,
    );
  }
  return response.json();
}

/**
 * Reads the message id from a provider's reply, failing if the reply does
 * not have the expected shape. `idField` is the field holding the id.
 */
export function readMessageId(
  reply: unknown,
  providerName: string,
  idField: string,
): string {
  const id =
    typeof reply === "object" && reply !== null
      ? (reply as Record<string, unknown>)[idField]
      : undefined;
  if (typeof id !== "string") {
    throw new MailSendError(
      `${providerName} accepted the email but its reply had no "${idField}": ${JSON.stringify(reply)}`,
    );
  }
  return id;
}
