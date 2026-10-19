/**
 * Ticket 5's done-when, in a real browser: an invited email can sign up,
 * verify, log out, reset the password, and log back in; an email not on
 * the invite list is refused.
 *
 * Emails are read from the local Mailpit inbox. Test data goes into the
 * browser-test database (e2e/support/e2e-database.ts) and is removed after.
 */
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  deleteMessagesTo,
  firstLinkIn,
  textOfEmailTo,
} from "../src/mail/testing/mailpit-inbox";
import { withE2eDatabase } from "./support/e2e-database";

const runId = randomUUID().slice(0, 8);
const email = `browser-${runId}@example.com`;
const handle = `browser_${runId}`;
const firstPassword = "the first long password";
const secondPassword = "the second long password";

test.beforeAll(async () => {
  await withE2eDatabase((client) =>
    client.query("INSERT INTO allowlist_entry (email) VALUES ($1)", [email]),
  );
});

test.afterAll(async () => {
  await withE2eDatabase(async (client) => {
    await client.query("DELETE FROM member WHERE email = $1", [email]);
    await client.query("DELETE FROM allowlist_entry WHERE email = $1", [email]);
  });
  await deleteMessagesTo(email);
});

test("an invited email can sign up, verify, log out, reset the password, and log back in", async ({
  page,
}) => {
  // Sign up.
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Handle").fill(handle);
  await page.getByLabel("Password", { exact: true }).fill(firstPassword);

  // The show/hide button reveals the password and hides it again.
  const passwordInput = page.getByLabel("Password", { exact: true });
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  // Verify: the emailed link logs the new Member in on the home page.
  await page.goto(firstLinkIn(await textOfEmailTo(email, "Confirm your email")));
  await expect(page.getByText(`Logged in as @${handle}`)).toBeVisible();

  // Log out.
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  // Reset the password.
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("we have sent it a link")).toBeVisible();
  await page.goto(
    firstLinkIn(await textOfEmailTo(email, "Reset your Showtakes password")),
  );
  await page.getByLabel("New password", { exact: true }).fill(secondPassword);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Your password has been changed")).toBeVisible();

  // Log back in, which the old password no longer does.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(firstPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("do not match an account")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(secondPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText(`Logged in as @${handle}`)).toBeVisible();
});

test("an email not on the invite list is refused, keeping what was typed", async ({
  page,
}) => {
  const uninvitedEmail = `not-invited-${runId}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(uninvitedEmail);
  await page.getByLabel("Handle").fill(`uninvited_${runId}`);
  await page.getByLabel("Password", { exact: true }).fill(firstPassword);
  await page.getByRole("button", { name: "Sign up" }).click();

  // Filtered by text: Next.js adds an empty route-announcer alert of its own.
  await expect(
    page.getByRole("alert").filter({ hasText: "not on the invite list" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(uninvitedEmail);
  await expect(page.getByLabel("Handle")).toHaveValue(`uninvited_${runId}`);
});
