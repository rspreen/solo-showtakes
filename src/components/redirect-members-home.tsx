/**
 * Sends a logged-in Member to the home page; renders nothing for a Visitor.
 * Used on pages only Visitors need (sign up, log in).
 *
 * It reads the session, which can only happen at request time, so pages
 * place it inside a `<Suspense>` boundary: the rest of the page is then
 * prebuilt and shows instantly, and this check streams in after
 * (node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
 */
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/server/actor";

/** Redirects to `/` when someone is logged in. */
export async function RedirectMembersHome() {
  if (await getCurrentMember()) redirect("/");
  return null;
}
