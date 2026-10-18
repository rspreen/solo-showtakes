/**
 * Unit tests for choosing the mail adapter from the environment. A fake
 * network shows where each configuration would send mail; nothing is sent.
 */
import { describe, expect, it } from "vitest";
import { createMailerFromEnvironment } from "./create-mailer";
import { createFakeFetch } from "./testing/fake-fetch";

const message = { to: "member@example.com", subject: "Hi", text: "Hello" };

describe("createMailerFromEnvironment", () => {
  it("with MAIL_PROVIDER=mailpit, sends to the local Mailpit inbox", async () => {
    const fake = createFakeFetch({ ID: "mailpit-id" });
    const mailer = createMailerFromEnvironment(
      {
        MAIL_PROVIDER: "mailpit",
        MAIL_FROM: "noreply@showtakes.test",
        MAILPIT_URL: "http://localhost:8025",
        // Present but must be ignored: development never reaches Resend.
        RESEND_API_KEY: "re_should_not_be_used",
      },
      fake.fetch,
    );

    await mailer.send(message);

    expect(fake.requests.map((request) => request.url)).toEqual([
      "http://localhost:8025/api/v1/send",
    ]);
  });

  it("with MAIL_PROVIDER=resend, sends through Resend", async () => {
    const fake = createFakeFetch({ id: "resend-id" });
    const mailer = createMailerFromEnvironment(
      {
        MAIL_PROVIDER: "resend",
        MAIL_FROM: "noreply@showtakes.com",
        RESEND_API_KEY: "re_test",
      },
      fake.fetch,
    );

    await mailer.send(message);

    expect(fake.requests.map((request) => request.url)).toEqual([
      "https://api.resend.com/emails",
    ]);
  });

  it("refuses to start without MAIL_PROVIDER, rather than guessing", () => {
    expect(() =>
      createMailerFromEnvironment({ MAIL_FROM: "noreply@showtakes.test" }),
    ).toThrow(/MAIL_PROVIDER must be "mailpit" or "resend"/);
  });

  it("names the missing setting when one is absent", () => {
    expect(() =>
      createMailerFromEnvironment({
        MAIL_PROVIDER: "resend",
        MAIL_FROM: "noreply@showtakes.com",
      }),
    ).toThrow(/RESEND_API_KEY is not set/);
  });
});
