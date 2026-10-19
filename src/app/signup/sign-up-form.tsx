"use client";
/**
 * The signup form. A Client Component (also runs in the browser) so it can
 * show the server action's result without a full page reload, using React's
 * `useActionState`.
 *
 * `failureMessages` must have an entry for every way signup can fail; if
 * the operation gains a new one, TypeScript flags this file until it says
 * how to explain it.
 */
import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type SignUpFailure } from "@/core/people/accounts.operations";
import {
  maximumPasswordLength,
  minimumPasswordLength,
} from "@/core/people/password";
import { type SignUpFormState, signUpAction } from "./actions";

type Field = "email" | "password" | "handle" | "form";

/** Where each failure is shown, and what it says. */
const failureMessages: Record<SignUpFailure, { field: Field; message: string }> = {
  "invalid-email": { field: "email", message: "Enter a valid email address." },
  "not-invited": {
    field: "form",
    message:
      "Showtakes is invite-only for now, and this email is not on the invite list.",
  },
  "password-too-short": { field: "password", message: "Use at least 12 characters." },
  "password-too-long": { field: "password", message: "Use at most 128 characters." },
  "handle-too-short": { field: "handle", message: "Use at least 2 characters." },
  "handle-too-long": { field: "handle", message: "Use at most 30 characters." },
  "handle-invalid-characters": {
    field: "handle",
    message: "Use only letters, numbers, periods, and underscores.",
  },
  "handle-must-start-with-letter-or-number": {
    field: "handle",
    message: "Start with a letter or number.",
  },
  "handle-consecutive-periods": {
    field: "handle",
    message: "Do not use two periods in a row.",
  },
  "handle-taken": { field: "handle", message: "That handle is taken. Try another." },
};

const initialState: SignUpFormState = { values: { email: "", handle: "" } };

/** Renders the signup form and its errors. */
export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const failure = state.failure ? failureMessages[state.failure] : undefined;
  const errorFor = (field: Field) =>
    failure?.field === field ? failure.message : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values.email}
        error={errorFor("email")}
      />
      <FormField
        label="Handle"
        name="handle"
        autoComplete="username"
        required
        minLength={2}
        maxLength={30}
        defaultValue={state.values.handle}
        hint="Your public name, like @roger. Letters, numbers, periods, and underscores."
        error={errorFor("handle")}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={minimumPasswordLength}
        maxLength={maximumPasswordLength}
        hint={`At least ${minimumPasswordLength} characters.`}
        showWhenPasswordAcceptable
        error={errorFor("password")}
      />
      <FormMessage>{errorFor("form")}</FormMessage>
      <SubmitButton pending={pending} pendingLabel="Signing up…">
        Sign up
      </SubmitButton>
    </form>
  );
}
