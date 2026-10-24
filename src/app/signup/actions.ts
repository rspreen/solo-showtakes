"use server";
/**
 * The signup form's server action: a function that runs on the server when
 * the form is submitted (like a Django view handling the POST), called from
 * sign-up-form.tsx.
 *
 * It only translates between the form and the signup operation
 * (src/core/people/accounts.operations.ts), which holds the rules. Expected
 * failures come back as state for the form to explain; on success the
 * browser is sent to the "check your email" page.
 */
import { redirect } from "next/navigation";
import { type SignUpFailure } from "@/core/people/accounts.operations";
import { getActor } from "@/server/actor";
import { getOperations } from "@/server/operations";
import { isOverRateLimit } from "@/server/rate-limit";

/**
 * Signup attempts allowed per IP address: 10 in 10 minutes. Enough for
 * typos and taken handles; refused attempts count too, so someone trying
 * many emails in bulk is stopped. (Only when RATE_LIMITING is on.)
 */
const signupRateLimit = { window: 10 * 60, max: 10 };

/**
 * Why signup did not go ahead: a reason from the signup operation, or
 * "too-many-attempts" from the rate limit checked here first.
 */
export type SignUpFormFailure = SignUpFailure | "too-many-attempts";

/** What the form shows after a submission that did not succeed. */
export interface SignUpFormState {
  failure?: SignUpFormFailure;
  /** What was typed, so the form can keep it (never the password). */
  values: { email: string; handle: string };
}

/** Runs signup with the submitted form, as the current request's Actor. */
export async function signUpAction(
  _previousState: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const details = {
    email: textField(formData, "email"),
    password: textField(formData, "password"),
    handle: textField(formData, "handle"),
  };

  // Checked before the operation, so a refused attempt costs no password
  // hashing or email lookups.
  if (await isOverRateLimit("signup", signupRateLimit)) {
    return {
      failure: "too-many-attempts",
      values: { email: details.email, handle: details.handle },
    };
  }

  const operations = await getOperations();
  const result = await operations.accounts.signUp(await getActor(), details);
  if (!result.ok) {
    return {
      failure: result.reason,
      values: { email: details.email, handle: details.handle },
    };
  }
  redirect("/signup/check-email");
}

/**
 * Reads a text field from the submitted form. The form always sends text,
 * so anything else means a tampered request.
 */
function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string") {
    throw new Error(`Signup form field "${name}" is missing or not text.`);
  }
  return value;
}
