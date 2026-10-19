# Better Auth handles logins directly; signup goes through an operation

ADR 0002 routes every action through the operations layer. Logging in, logging out, verifying an email, and resetting a password are an exception: the pages for them call Better Auth's own HTTP endpoints (under `/api/auth`) from the browser. These actions hold no Showtakes rules, only login mechanics that Better Auth implements, and Better Auth's rate limiting and cross-site request checks apply only to requests on that path, not to calls made from our server code. Wrapping them in operations would have meant operations handling cookies and request headers, and losing those protections.

Signup is not an exception, because it carries our rules: the invite allowlist, the handle format, and handle uniqueness. The signup page's server action calls `operations.accounts.signUp`, which checks those rules, returns expected failures as a `Result` (ADR 0004), and only then asks Better Auth to create the Member. Core code reaches Better Auth only through the `MemberAccountCreator` interface it defines; the implementation lives in `src/auth/`.

## Consequences

- Better Auth's public signup endpoint is switched off (`disabledPaths`), so signup has one way in. As a second line of defence, Better Auth's `validateUserInfo` hook rejects any Member creation for an email not on the allowlist, however it was attempted.
- Better Auth owns the shape of the `member`, `session`, `account`, and `verification` tables. We define them by hand in `src/core/people/schema.ts` (integer ids per ADR 0003, our names via its `modelName` and `fields` options) rather than generating them, and Better Auth checks them against its expectations at startup. A Better Auth upgrade may need a migration.
- Signup never reveals whether an email already has an account: it behaves as for a new one and emails the existing owner instead. The same holds for password reset requests.
- Sessions last 90 days from last use; a password reset logs out every other browser.
- `src/wiring/create-services.ts` is the one place the database, Mailer, Better Auth, and operations are built and connected, for both the web app (`src/server/services.ts`) and integration tests, so tests exercise the real wiring.
- Roles (ticket 6) are not yet part of the Actor built from the session (`src/server/actor.ts`).
