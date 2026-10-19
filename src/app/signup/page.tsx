/**
 * The signup page, at /signup. A Server Component (renders on the server);
 * the interactive form is in sign-up-form.tsx.
 *
 * Logged-in Members are sent home (RedirectMembersHome): signup is for
 * Visitors, and the signup operation would refuse them anyway.
 */
import Link from "next/link";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth-panel";
import { RedirectMembersHome } from "@/components/redirect-members-home";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Sign up · Showtakes" };

/** Renders the signup page. */
export default function SignUpPage() {
  return (
    <AuthPanel
      title="Sign up"
      intro="Showtakes is invite-only for now: use the email address your invitation went to."
    >
      <Suspense>
        <RedirectMembersHome />
      </Suspense>
      <SignUpForm />
      <p className="text-sm text-muted-foreground">
        Already a Member? <Link href="/login" className="underline">Log in</Link>
      </p>
    </AuthPanel>
  );
}
