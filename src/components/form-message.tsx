/**
 * A message about a whole form (not one field), such as "Wrong email or
 * password". `role="alert"` makes screen readers announce it as it appears.
 */

/** Renders `children` as an error or a neutral notice; nothing if empty. */
export function FormMessage({
  children,
  tone = "error",
}: {
  children?: React.ReactNode;
  tone?: "error" | "notice";
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
    >
      {children}
    </p>
  );
}
