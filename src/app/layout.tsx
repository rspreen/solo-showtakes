/**
 * Root layout: the outermost wrapper for every page on the site.
 *
 * Where this sits: Next.js's App Router treats every folder under `src/app/`
 * as a URL segment, and a `layout.tsx` in a folder wraps every page beneath
 * it. This one is at the top, so it supplies the <html> and <body> tags,
 * global styles (`globals.css`, which loads Tailwind), and fonts for the
 * whole site. Pages render inside it as `children`.
 *
 * This runs on the server (a React Server Component) and ships no JavaScript
 * to the browser by itself.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from our own domain, so no
// request goes to Google when a visitor loads a page. The `variable` names are
// the CSS variables that `globals.css` (via shadcn's theme) reads.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Default <title> and description for pages that don't set their own.
export const metadata: Metadata = {
  title: "Showtakes",
  description: "Ratings and reviews of theatre productions, by theatre lovers.",
};

/** Wraps every page in the site-wide <html>/<body> shell. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
