/**
 * The login page, at /login. Logged-in Members are sent home
 * (RedirectMembersHome).
 */
import Link from "next/link";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth-panel";
import { RedirectMembersHome } from "@/components/redirect-members-home";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · Showtakes" };

/** Renders the login page. */
export default function LoginPage() {
  return (
    <AuthPanel title="Log in">
      <Suspense>
        <RedirectMembersHome />
      </Suspense>
      <LoginForm />
      <p className="text-sm text-muted-foreground">
        New here? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </AuthPanel>
  );
}
