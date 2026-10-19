"use client";
/**
 * The "choose a new password" form, reached from the emailed reset link.
 * Sends the new password and the link's token to Better Auth (ADR 0005),
 * which also logs out every other browser (auth.ts).
 */
import Link from "next/link";
import { useActionState } from "react";
import { authClient } from "@/auth/client";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

type ResetState = "editing" | "done" | "link-expired" | "too-short" | "failed";

/** Renders the form for the reset link carrying `token`. */
export function ResetPasswordForm({ token }: { token: string }) {
  async function reset(
    _previousState: ResetState,
    formData: FormData,
  ): Promise<ResetState> {
    const { error } = await authClient.resetPassword({
      token,
      newPassword: String(formData.get("password") ?? ""),
    });
    if (!error) return "done";
    if (error.code === "INVALID_TOKEN") return "link-expired";
    if (error.code === "PASSWORD_TOO_SHORT") return "too-short";
    console.error("Resetting the password failed", error);
    return "failed";
  }

  const [state, formAction, pending] = useActionState(reset, "editing");

  if (state === "done") {
    return (
      <FormMessage tone="notice">
        Your password has been changed.{" "}
        <Link href="/login" className="underline">Log in</Link> with your new password.
      </FormMessage>
    );
  }
  if (state === "link-expired") return <ExpiredLinkMessage />;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
        hint="At least 12 characters."
        error={state === "too-short" ? "Use at least 12 characters." : undefined}
      />
      <FormMessage>
        {state === "failed" && "Something went wrong. Please try again in a moment."}
      </FormMessage>
      <SubmitButton pending={pending} pendingLabel="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}

/** Explains that the reset link no longer works, and how to get another. */
export function ExpiredLinkMessage() {
  return (
    <FormMessage>
      This reset link has expired or was already used.{" "}
      <Link href="/forgot-password" className="underline">Request a new one</Link>.
    </FormMessage>
  );
}
