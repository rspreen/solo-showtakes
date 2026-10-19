/**
 * Shown after signing up, at /signup/check-email: the new Member must click
 * the link in their verification email before they can log in.
 *
 * The wording also covers an email that already had an account (signup
 * looks the same either way, so it cannot reveal who is a Member).
 */
import Link from "next/link";
import { AuthPanel } from "@/components/auth-panel";

export const metadata = { title: "Check your email · Showtakes" };

/** Renders the "check your email" page. */
export default function CheckEmailPage() {
  return (
    <AuthPanel title="Check your email">
      <p>
        We have sent you an email. Click the link in it to confirm your address
        and finish signing up. The link works for one hour.
      </p>
      <p className="text-sm text-muted-foreground">
        Nothing arrived? Check your spam folder, or{" "}
        <Link href="/login" className="underline">log in</Link> to have a new link sent.
      </p>
    </AuthPanel>
  );
}
