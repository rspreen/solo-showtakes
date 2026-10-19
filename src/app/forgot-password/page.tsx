/**
 * The "forgot your password" page, at /forgot-password.
 */
import { AuthPanel } from "@/components/auth-panel";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = { title: "Forgot password · Showtakes" };

/** Renders the forgot-password page. */
export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      title="Forgot your password?"
      intro="Enter your email and we will send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
