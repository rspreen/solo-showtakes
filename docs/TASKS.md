# Tasks

Ordered work list for Showtakes. Reorder freely; work is taken from the top of **Now**.
Elsewhere, refer to a ticket by its name, not its number, since numbers change when tickets move.
Domain terms are defined in [CONTEXT.md](../CONTEXT.md); architecture decisions are in [adr/](./adr/).

## Now: MVP (invite-only)

### Foundations

1. **Project skeleton** (done 2026-10-15)
   - Next.js app in TypeScript strict mode, managed with pnpm.
   - Tailwind and shadcn/ui installed; one placeholder home page.
   - Lint, type check, Vitest, and Playwright wired up.
   - GitHub Actions runs all checks on every push.
   - Done when: `pnpm dev` serves the placeholder and CI is green.

2. **Local database and migrations** (done 2026-10-17)
   - Postgres for development and tests runs in OrbStack via Docker Compose.
   - Drizzle schema and SQL migration files are committed.
   - Integration tests run against a throwaway database.
   - Done when: one command migrates a fresh database, and a sample integration test creates and cleans up its own data.

3. **Operations layer skeleton** (ADR 0002, ADR 0004; done 2026-10-17)
   - An Actor type (Visitor, or Member id plus roles).
   - Database passed in rather than imported.
   - One convention for permission refusals.
   - One example operation with unit and integration tests.
   - Done when: a test reads as "as member A, do X; expect refusal" and passes.

4. **Email sending** (done 2026-10-18)
   - A mail interface with two adapters: a local inbox tool for development and Resend or Postmark for production. (Chosen: Mailpit and Resend.)
   - Done when: a test email from local development appears in the local inbox and nowhere else.

5. **Accounts and the invite allowlist** (ADR 0005; done 2026-10-18)
   - Better Auth with email and password, email verification, password reset, and long-lived sessions.
   - Signup works only for emails on the allowlist.
   - Handle is chosen at signup and must meet the format rules: 2-30 characters, letters, numbers, periods and underscores, starting with a letter or number, no consecutive periods, lowercased, unique.
   - Done when: an allowlisted email can sign up, verify, log out, reset the password, and log back in; a non-listed email is refused; handle rules are covered by unit tests.

6. **Logging** (ADR 0006; done 2026-10-18)
   - A Logger interface passed in like the database and Mailer, with a Pino adapter writing one JSON object per line to standard output, and also to `logs/showtakes.log` (not committed) in development. `LOG_LEVEL` sets which levels appear.
   - Named events with fixed fields: event, reason, email, IP address, user agent, Member id, and request id. Successes are logged at info, refusals and failed logins at warn, and faults at error.
   - Passwords, tokens, cookies, and authorization headers are always redacted.
   - Better Auth's own messages go to the same logger. An after-hook logs login, logout, verification, and password reset outcomes, and the signup operation logs its own outcomes.
   - Operations receive a logger built for the request, carrying its IP address (from the header the host sets) and request id.
   - Done when: a failed login and a non-invited signup each write a warn line with the email and IP address to the log file, and a test shows a password never appears in the output.

7. **Roles and the first Admin** (ADR 0007; done 2026-10-19)
   - Curator and Admin roles on Member.
   - A script that promotes a Member to Admin by email.
   - Done when: the script works locally, and role checks are enforced in the operations layer.

8. **First deploy**
   - Vercel, Neon Postgres, Cloudflare R2, and the email provider, with DNS for showtakes.com.
   - A preview deployment per branch.
   - Handling a Resend outage or rate-limit failure (today `MailSendError` just fails the request; see `src/mail/`).
   - Rate-limit counters stored in the database (Better Auth's `database` rate-limit storage) rather than in memory, with limits on login, password reset requests, verification resends, and the signup server action (ADR 0006).
   - New passwords checked against known breaches (Better Auth's `haveibeenpwned` plugin), and a decision on whether signup goes ahead or is refused while that service is down.
   - A log drain sending logs to a log service (Axiom, Better Stack, or similar), with a retention period of 30 to 90 days. Check which Vercel plans include log drains. Set `LOG_LEVEL` in the host's settings (it is required), and leave `LOG_FILE` unset.
   - Check that Vercel's `x-forwarded-for` holds the real client IP address in logs (`src/logging/request-context.ts`).
   - Done when: production signup works end to end on the real domain.

9. **Backups**
   - Point-in-time restore enabled on the database.
   - A nightly dump copied to separate storage.
   - One rehearsed restore, written up.
   - Done when: the rehearsal has been performed before any tester is invited.

### Reference data and media

10. **City reference list**
    - GeoNames cities above roughly 15,000 population imported by script.
    - A City typeahead operation.
    - Admins can add a City.
    - Done when: typing "new y" offers New York City.

11. **Image storage**
    - A storage interface backed by a local folder in development and R2 in production.
    - Uploads are size-limited and resized to a few fixed sizes.
    - Done when: an uploaded image is served at each size in both environments.

### Members

12. **Profile**
    - Edit display name (up to 30 characters, any characters), bio, avatar, City, default comment setting (anyone or just you), and handle (freely changeable).
    - Public profile page by handle.
    - Done when: a Visitor can view a Member's profile.

13. **Admin: members and allowlist**
    - Admin screens to list, create (bypassing verification), edit, and delete Members; grant and revoke roles; manage the allowlist.
    - Done when: you can invite a tester and make them a Curator entirely through the interface.

### Catalog

14. **UI prototypes** (separate session)
    - Two or three throwaway looks for the home page and the Production page.
    - Done when: one direction is chosen.

15. **Create and edit Productions**
    - A Curator creates a Production.
    - The title typeahead links to an existing Work or silently creates one (title, creators, Category).
    - Dates: start year required; start month, end year, and end month optional.
    - Optional fields: producer, description, website, image.
    - The creator becomes the Owner, and only the Owner or an Admin can edit.
    - Done when: the permission rules are covered by operation tests.

16. **Engagements and Venues**
    - The Owner adds Engagements: City required, Venue optional (typeahead, created inline, must be in the same City), dates optional.
    - Done when: a touring Production can list several Engagements.

17. **Production page**
    - Image, title with qualifier (producer, City, start year), description, website, and Engagements.
    - Rating summary and reviews are added by later tickets.
    - Done when: the page is viewable by Visitors.

18. **Browse and search**
    - Lists of recently added and recently reviewed Productions.
    - Fuzzy title search in Postgres.
    - Done when: a misspelled title still finds the Production.

### Opinions

19. **Ratings**
    - A Member sets or clears one Rating per Production (half to five stars).
    - The Production page shows the mean to two decimals, the count, stars, and a distribution chart.
    - Ratings are public on the Member's profile.
    - Done when: the average recalculates correctly in tests.

20. **Reviews**
    - One Review per Member per Production, up to 15,000 characters.
    - States: Draft, Published, Withdrawn.
    - An "edited" marker after publishing.
    - The Production page lists Published reviews, collapsed with "more", sorted by most liked (default) or most recent.
    - Done when: the state transitions are covered by tests.

21. **Likes**
    - Toggle a Like on another Member's Published Review; no self-likes.
    - The count is shown on the Review.
    - Done when: the rules are covered by operation tests.

22. **Comments**
    - A flat list per Review, up to 2,000 characters.
    - Per-Review setting (anyone or just you), defaulting from the profile.
    - The setting gates new Comments only.
    - The author can always comment; commenters can delete their own; the Review's author can delete any Comment on it.
    - Done when: the rules are covered by operation tests.

23. **My reviews**
    - A Member's own list of Reviews in every state, sortable by Production, date written, or most recent Comment.

### Administration and lifecycle

24. **Admin: catalog and moderation**
    - Edit any Production, reassign its Owner, and delete it.
    - Mark a Review or Comment as Removed.

25. **Deletion rules**
    - Account deletion erases the Member's Ratings, Reviews, Comments, and Likes, and their Productions become admin-owned.
    - An Owner can delete a Production only while it has no Ratings or Reviews.

26. **Merge script**
    - Merge duplicate Works or Venues, moving everything attached to them.

27. **Logged-in home page**
    - Sign out, plus whatever the chosen prototype shows for a logged-in Member.

### Small items

Minor improvements, picked up whenever convenient.

- (done 2026-10-19) Signup password field: show a standard "acceptable" indicator, such as a check mark, once the typed password meets the rules (12 to 128 characters, from `src/core/people/password.ts`), so people know they can stop editing it. Also on the reset page's new-password field.

## Next: after the MVP

- Follow, and the activity feed of followed Members' Ratings, Reviews, and Comments
- "Members you follow" as a comment setting; "most followed reviewers" sort
- Location browsing ("playing near me")
- Weighted "top rated" ordering

## Before public signup

- Block (semantics settled; see CONTEXT.md)
- Reporting Comments, and a moderation queue
- Handle and display-name change limits, and the 14-day hold on an old handle
- Per-account login throttling: after about 10 failures in 15 minutes, refuse that email's logins for 15 minutes with the usual "do not match" message. A counter in the database, and no hard lockout (ADR 0006).
- Email the Member when their password changes
- Spam defences beyond rate limiting
- Terms of use, privacy policy (covering the emails and IP addresses kept in logs), and an image takedown contact
- "Message the Owner" queue

## Later: no date set

- Scraping or importing tools to populate the catalog (check each source's terms first). When this starts, split the repo into a pnpm-workspace monorepo (`apps/web`, `apps/scraper`, `packages/core` from `src/core` and `src/db`) so the scraper reuses the same rules; the import-boundary lint rule keeps that split a matter of moving folders.
- Lists (whether a List can hold Works is still open)
- Advertising
- Ticket referral buttons
- Verified Producer accounts
- Change history on catalog entries
- Public API or mobile app
