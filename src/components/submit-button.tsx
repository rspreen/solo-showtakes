/**
 * A form's submit button, disabled while the form is being sent so it
 * cannot be submitted twice. Built on the generated shadcn/ui Button.
 */
import { Button } from "@/shadcn/components/ui/button";

/** Renders the submit button; `pending` disables it and shows `pendingLabel`. */
export function SubmitButton({
  pending,
  children,
  pendingLabel = "Working…",
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
