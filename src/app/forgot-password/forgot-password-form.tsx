"use client";
/**
 * The "forgot your password" form: asks Better Auth to email a reset link
 * (ADR 0005). The reply is the same whether or not the email has an
 * account, so the form cannot be used to discover who is a Member.
 */
import { useActionState } from "react";
import { authClient } from "@/auth/client";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

interface ForgotPasswordState {
  sent: boolean;
  failed: boolean;
}

/** Renders the form, then a confirmation once a link was requested. */
export function ForgotPasswordForm() {
  async function requestLink(
    _previousState: ForgotPasswordState,
    formData: FormData,
  ): Promise<ForgotPasswordState> {
    const { error } = await authClient.requestPasswordReset({
      email: String(formData.get("email") ?? ""),
      // The emailed link leads to this page, with a token (reset-password/).
      redirectTo: "/reset-password",
    });
    if (error) console.error("Requesting a password reset failed", error);
    return { sent: !error, failed: Boolean(error) };
  }

  const [state, formAction, pending] = useActionState(requestLink, {
    sent: false,
    failed: false,
  });

  if (state.sent) {
    return (
      <FormMessage tone="notice">
        If that email has a Showtakes account, we have sent it a link to choose
        a new password. The link works for one hour.
      </FormMessage>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Email" name="email" type="email" autoComplete="email" required />
      <FormMessage>
        {state.failed && "Something went wrong. Please try again in a moment."}
      </FormMessage>
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
