"use client";
/**
 * A password input with a show/hide button, so people can check what they
 * typed. FormField (form-field.tsx) uses it for every `type="password"`
 * field: signup, login, and password reset.
 *
 * A Client Component (runs in the browser) because the button keeps
 * on/off state. Showing the password only switches the input's `type`
 * between "password" and "text"; the value, name, and form submission are
 * unchanged.
 */
import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { Input } from "@/shadcn/components/ui/input";

/** The Input's own props, minus `type`, which this component controls. */
export type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">;

/** Renders the password input with a show/hide toggle inside its right edge. */
export function PasswordInput({ className, ...inputProps }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  // The button's name says what pressing it will do, which screen readers
  // announce ("Show password", then "Hide password").
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <div className="relative">
      <Input
        {...inputProps}
        type={visible ? "text" : "password"}
        // Room on the right so typed text never runs under the button.
        className={`pr-9 ${className ?? ""}`}
      />
      <button
        // type="button" so pressing it never submits the form.
        type="button"
        onClick={() => setVisible((wasVisible) => !wasVisible)}
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-controls={inputProps.id}
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
