/**
 * Integration test for the "Email sending" ticket's done-when: an email sent
 * with the local development settings (`.env`, copied from `.env.example`)
 * arrives in the local Mailpit inbox. Mailpit never relays mail onward, so
 * arriving there means it went nowhere else. Needs `pnpm services:up`.
 */
// Load .env first: this test checks the local development settings.
import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { createMailerFromEnvironment } from "./create-mailer";
import {
  deleteMessagesTo,
  messagesTo,
  uniqueTestAddress,
} from "./testing/mailpit-inbox";

const recipient = uniqueTestAddress();

afterEach(() => deleteMessagesTo(recipient));

describe("mail in local development", () => {
  it("is configured to use the local Mailpit inbox", () => {
    expect(process.env.MAIL_PROVIDER).toBe("mailpit");
  });

  it("a test email appears in the local inbox", async () => {
    const mailer = createMailerFromEnvironment();

    const sent = await mailer.send({
      to: recipient,
      subject: "Showtakes test email",
      text: "If you can read this, local email works.",
      html: "<p>If you can read this, local email works.</p>",
    });

    const inbox = await messagesTo(recipient);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      ID: sent.id,
      Subject: "Showtakes test email",
      From: { Name: "Showtakes", Address: process.env.MAIL_FROM },
    });
  });
});
