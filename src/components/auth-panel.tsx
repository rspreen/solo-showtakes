/**
 * The frame around the account pages (sign up, log in, password reset): a
 * centred column with a heading. Deliberately plain until the site's look is
 * chosen in the UI prototype session (ticket 13).
 */

/** Renders a page heading, optional intro, and the page's content. */
export function AuthPanel({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {intro && <div className="text-sm text-muted-foreground">{intro}</div>}
      </div>
      {children}
    </main>
  );
}
