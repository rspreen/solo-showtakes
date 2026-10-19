/**
 * The emails sent by the login system: what each one says.
 *
 * Better Auth (auth.ts) decides when to send them and supplies the links; these
 * functions only build the message, which auth.ts hands to the Mailer
 * (src/mail/). Plain text plus a simple HTML version; designed templates can
 * come with the site's visual design (the "UI prototypes" ticket).
 */
import { type MailMessage } from "@/mail/mailer";

/** Asks a new Member to confirm their address. */
export function verificationEmail(to: string, link: string): MailMessage {
  return {
    to,
    subject: "Confirm your email for Showtakes",
    text:
      "Welcome to Showtakes.\n\n" +
      `Confirm your email address to finish signing up:\n${link}\n\n` +
      "The link works for one hour. If you did not sign up, ignore this email.",
    html:
      "<p>Welcome to Showtakes.</p>" +
      `<p><a href="${escapeHtml(link)}">Confirm your email address</a> to finish signing up.</p>` +
      "<p>The link works for one hour. If you did not sign up, ignore this email.</p>",
  };
}

/** Sends a Member a link to choose a new password. */
export function passwordResetEmail(to: string, link: string): MailMessage {
  return {
    to,
    subject: "Reset your Showtakes password",
    text:
      `To choose a new Showtakes password, open this link:\n${link}\n\n` +
      "The link works for one hour. If you did not ask for this, ignore this email; your password has not changed.",
    html:
      `<p><a href="${escapeHtml(link)}">Choose a new Showtakes password</a>.</p>` +
      "<p>The link works for one hour. If you did not ask for this, ignore this email; your password has not changed.</p>",
  };
}

/**
 * Tells a Member that someone tried to sign up with their address. Signup
 * looks the same whether or not an email has an account (so it cannot be
 * used to discover Members), so this is how the real owner finds out.
 */
export function existingAccountEmail(
  to: string,
  loginLink: string,
): MailMessage {
  return {
    to,
    subject: "Someone tried to sign up with your email",
    text:
      "Someone just tried to create a Showtakes account with this email address, " +
      "which already has one.\n\n" +
      `If it was you, log in instead (or reset your password from there):\n${loginLink}\n\n` +
      "If it was not you, you can ignore this email; nothing has changed.",
    html:
      "<p>Someone just tried to create a Showtakes account with this email address, which already has one.</p>" +
      `<p>If it was you, <a href="${escapeHtml(loginLink)}">log in instead</a> (or reset your password from there).</p>` +
      "<p>If it was not you, you can ignore this email; nothing has changed.</p>",
  };
}

/** Escapes text for safe use inside HTML, such as in an href. */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
