"use client";
/**
 * The login form. It calls Better Auth's browser client directly (ADR 0005):
 * logging in holds no Showtakes rules, and Better Auth's rate limiting and
 * cross-site protections apply only on this path. On success Better Auth
 * has set the session cookie, and the browser goes to the home page.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { authClient } from "@/auth/client";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

interface LoginFormState {
  message?: string;
  email: string;
}

/** Renders the login form. */
export function LoginForm() {
  const router = useRouter();

  async function logIn(
    _previousState: LoginFormState,
    formData: FormData,
  ): Promise<LoginFormState> {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const { error } = await authClient.signIn.email({ email, password });
    if (!error) {
      router.push("/");
      router.refresh();
      return { email };
    }
    return { email, message: messageFor(error.code) };
  }

  const [state, formAction, pending] = useActionState(logIn, { email: "" });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormMessage>{state.message}</FormMessage>
      <SubmitButton pending={pending} pendingLabel="Logging in…">
        Log in
      </SubmitButton>
      <Link href="/forgot-password" className="text-sm underline">
        Forgot your password?
      </Link>
    </form>
  );
}

/** Explains a Better Auth login error code to the Member. */
function messageFor(code: string | undefined): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password do not match an account.";
    case "EMAIL_NOT_VERIFIED":
      // Better Auth has just sent a fresh link (sendOnSignIn in auth.ts).
      return "Please confirm your email first. We have sent you a new link.";
    default:
      return "Logging in failed. Please try again in a moment.";
  }
}
