/**
 * Unit tests for the Resend adapter, with a fake network: what it sends to
 * Resend, and how it reports Resend's rejections. No real email is sent.
 */
import { describe, expect, it } from "vitest";
import { MailSendError } from "./mailer";
import { createResendMailer } from "./resend-mailer";
import { createFakeFetch } from "./testing/fake-fetch";

const from = { name: "Showtakes", address: "noreply@showtakes.com" };
const message = {
  to: "member@example.com",
  subject: "Verify your email",
  text: "Plain body",
  html: "<p>HTML body</p>",
};

describe("Resend mailer", () => {
  it("posts the email to Resend with the API key, and returns Resend's id", async () => {
    const fake = createFakeFetch({ id: "resend-id-1" });
    const mailer = createResendMailer({ apiKey: "re_test", from, fetch: fake.fetch });

    const sent = await mailer.send(message);

    expect(sent).toEqual({ id: "resend-id-1" });
    expect(fake.requests).toHaveLength(1);
    expect(fake.requests[0]).toMatchObject({
      url: "https://api.resend.com/emails",
      method: "POST",
      headers: { authorization: "Bearer re_test" },
      body: {
        from: "Showtakes <noreply@showtakes.com>",
        to: "member@example.com",
        subject: "Verify your email",
        text: "Plain body",
        html: "<p>HTML body</p>",
      },
    });
  });

  it("throws MailSendError with Resend's status and explanation on rejection", async () => {
    const fake = createFakeFetch(
      { name: "validation_error", message: "The showtakes.com domain is not verified." },
      403,
    );
    const mailer = createResendMailer({ apiKey: "re_test", from, fetch: fake.fetch });

    const failure = await mailer.send(message).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(MailSendError);
    expect(failure).toMatchObject({ status: 403 });
    expect((failure as Error).message).toContain("domain is not verified");
  });

  it("throws MailSendError if Resend's reply has no id", async () => {
    const fake = createFakeFetch({});
    const mailer = createResendMailer({ apiKey: "re_test", from, fetch: fake.fetch });

    await expect(mailer.send(message)).rejects.toThrow(MailSendError);
  });
});
