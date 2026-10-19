/**
 * One labelled form input with an optional hint and error message, used by
 * every form on the site (signup, login, password reset so far).
 *
 * Built on the generated shadcn/ui Input and Label (src/shadcn/). The hint
 * and error are linked to the input with `aria-describedby`, so screen
 * readers announce them, and an error marks the input `aria-invalid`, which
 * the shadcn styles show in red.
 */
import { Input } from "@/shadcn/components/ui/input";
import { Label } from "@/shadcn/components/ui/label";

export interface FormFieldProps {
  label: string;
  /** The form field name, also used as the input's id. */
  name: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: string;
  /** Guidance shown under the input, such as format rules. */
  hint?: string;
  /** What is wrong with the value, shown instead of the hint. */
  error?: string;
}

/** Renders a label, an input, and its hint or error. */
export function FormField({
  label,
  name,
  type = "text",
  hint,
  error,
  defaultValue,
  ...inputProps
}: FormFieldProps) {
  const describedById = `${name}-description`;
  const description = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {/* A new `key` gives a fresh input when the default changes (a form
          refilled after an error), since Base UI inputs read it only once. */}
      <Input
        key={defaultValue ?? ""}
        defaultValue={defaultValue}
        id={name}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={description ? describedById : undefined}
        {...inputProps}
      />
      {description && (
        <p
          id={describedById}
          className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {description}
        </p>
      )}
    </div>
  );
}
