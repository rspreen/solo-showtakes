/**
 * The "choose a new password" page, at /reset-password. The emailed link
 * goes first to Better Auth, which checks the token and sends the browser
 * here with `?token=...`, or with `?error=INVALID_TOKEN` if the link has
 * expired or was used.
 *
 * Reading the address's query (`searchParams`) happens at request time, so
 * that part sits inside `<Suspense>`; the heading is prebuilt.
 */
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth-panel";
import { ExpiredLinkMessage, ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Choose a new password · Showtakes" };

/** Renders the page frame; the form streams in once the link is read. */
export default function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  return (
    <AuthPanel title="Choose a new password">
      <Suspense>
        <ResetFormForLink searchParams={searchParams} />
      </Suspense>
    </AuthPanel>
  );
}

/** Renders the form, or explains why the link no longer works. */
async function ResetFormForLink({
  searchParams,
}: Pick<PageProps<"/reset-password">, "searchParams">) {
  const { token, error } = await searchParams;
  const usableToken = typeof token === "string" && !error ? token : undefined;
  return usableToken ? <ResetPasswordForm token={usableToken} /> : <ExpiredLinkMessage />;
}
