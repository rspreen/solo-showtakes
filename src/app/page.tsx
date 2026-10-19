/**
 * Home page, served at `/`.
 *
 * Placeholder (the "Project skeleton" ticket in docs/TASKS.md): the real home
 * page is designed in the UI prototype session ("UI prototypes") and built in
 * "Logged-in home page". For now it shows who is logged in, with log in / sign
 * up links or a log out button, so the account flow ("Accounts and the invite
 * allowlist") can be tried by hand.
 *
 * Email-verification links land here (auth.ts sends new Members to `/`).
 * If the link had expired, Better Auth adds `?error=...`, explained below.
 * The browser tests in `e2e/` check this page.
 *
 * The heading is prebuilt and shows instantly; the account area reads the
 * session (and the address's query), which only happens at request time,
 * so it streams in behind `<Suspense>`.
 */
import Link from "next/link";
import { Suspense } from "react";
import { FormMessage } from "@/components/form-message";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentMember } from "@/server/actor";

/** Renders the placeholder home page. */
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Showtakes</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Ratings and reviews of theatre productions. Coming soon.
      </p>
      <Suspense>
        <AccountArea searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Who is logged in, with the matching links or log out button. */
async function AccountArea({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const [currentMember, { error }] = await Promise.all([
    getCurrentMember(),
    searchParams,
  ]);

  return (
    <>
      <FormMessage>
        {error &&
          "That link has expired or was already used. Log in to have a new one sent."}
      </FormMessage>
      {currentMember ? (
        <>
          <p>Logged in as @{currentMember.handle}</p>
          <SignOutButton />
        </>
      ) : (
        <p className="flex gap-4">
          <Link href="/login" className="underline">Log in</Link>
          <Link href="/signup" className="underline">Sign up</Link>
        </p>
      )}
    </>
  );
}
