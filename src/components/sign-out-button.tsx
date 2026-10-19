"use client";
/**
 * The "Log out" button. A Client Component (runs in the browser) because it
 * calls Better Auth's browser client, which ends the session and clears the
 * cookie (ADR 0005); it then refreshes the page so server-rendered parts
 * show the Visitor view.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/auth/client";
import { Button } from "@/shadcn/components/ui/button";
import { FormMessage } from "./form-message";

/** Renders the button and logs the Member out when clicked. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);
    const { error } = await authClient.signOut();
    setPending(false);
    if (error) {
      // Errors thrown in click handlers never reach Next's error page, so
      // log the detail and tell the Member.
      console.error("Logging out failed", error);
      setFailed(true);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="outline" onClick={signOut} disabled={pending}>
        {pending ? "Logging out…" : "Log out"}
      </Button>
      <FormMessage>{failed && "Logging out failed. Please try again."}</FormMessage>
    </div>
  );
}
