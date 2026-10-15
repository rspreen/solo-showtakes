/**
 * Home page, served at `/`.
 *
 * Placeholder only (ticket 1 in docs/TASKS.md). The real home page is
 * designed in the UI prototype session (ticket 13) and built in ticket 26.
 * The browser test in `e2e/home.spec.ts` checks that this page loads.
 */

/** Renders the placeholder home page. */
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Showtakes</h1>
      <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Ratings and reviews of theatre productions. Coming soon.
      </p>
    </main>
  );
}
