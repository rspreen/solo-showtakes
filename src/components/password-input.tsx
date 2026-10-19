"use client";
/**
 * A password input with a show/hide button, so people can check what they
 * typed. FormField (form-field.tsx) uses it for every `type="password"`
 * field: signup, login, and password reset.
 *
 * Where a new password is chosen (signup and reset), it can also show a
 * green check mark once the typed password meets the rules, so people know
 * they can stop editing it. The check is `checkPassword` from
 * src/core/people/password.ts, the same function the server applies, so the
 * check mark and the server never disagree. Login leaves it off: a check
 * mark there would wrongly suggest the password is correct.
 *
 * A Client Component (runs in the browser) because the button and the
 * check mark change as the person types and clicks. Showing the password
 * only switches the input's `type` between "password" and "text"; the
 * value, name, and form submission are unchanged.
 */
import { CircleCheck, Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { checkPassword } from "@/core/people/password";
import { Input } from "@/shadcn/components/ui/input";

/** The Input's own props, minus `type`, which this component controls. */
export type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  /** Show a check mark once the typed password meets the rules. */
  showWhenAcceptable?: boolean;
};

/** Renders the password input with a show/hide toggle inside its right edge. */
export function PasswordInput({
  className,
  showWhenAcceptable = false,
  onChange,
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [acceptable, setAcceptable] = useState(false);
  // The button's name says what pressing it will do, which screen readers
  // announce ("Show password", then "Hide password").
  const toggleLabel = visible ? "Hide password" : "Show password";
  const showCheckMark = showWhenAcceptable && acceptable;

  return (
    <div className="relative">
      <Input
        {...inputProps}
        type={visible ? "text" : "password"}
        onChange={(event) => {
          if (showWhenAcceptable) {
            setAcceptable(checkPassword(event.currentTarget.value).ok);
          }
          onChange?.(event);
        }}
        // Room on the right so typed text never runs under the icons.
        className={`${showWhenAcceptable ? "pr-16" : "pr-9"} ${className ?? ""}`}
      />
      {showCheckMark && (
        <CircleCheck
          className="pointer-events-none absolute inset-y-0 right-9 my-auto size-4 text-green-600 dark:text-green-500"
          aria-hidden
        />
      )}
      {showWhenAcceptable && (
        // Announced by screen readers when it changes, in place of the icon.
        <span role="status" className="sr-only">
          {showCheckMark ? "Password meets the rules." : ""}
        </span>
      )}
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
