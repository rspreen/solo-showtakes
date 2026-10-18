# Operations are sliced by area, and refusals are thrown while expected failures are returned

This settles how the operations layer of ADR 0002 is laid out, how it receives the database, and how it reports failure.

## Layout: one folder per area of the domain

Business rules, operations, and tables live in `src/core/`, in one folder per section of CONTEXT.md (`people/`, `catalog/`, `opinions/`) plus `shared/` for what every area uses (the Actor, permission checks, the Result type). An area folder is created when it gets its first code. We chose this over one folder per technical layer (`src/domain/`, `src/operations/`, `src/db/`) because a feature's rules, operations, tables, and tests then sit together, which keeps changes and code review local as the site grows, and because the areas follow the domain language. Pages and UI components stay in `src/app/` and `src/components/`, where Next.js routing puts them.

Within an area, file names say what a file may do:

- `<concept>.operations.ts`: operations, which may use the database.
- `schema.ts`: the area's tables. `src/db/schema.ts` re-exports every area's tables for drizzle-kit and the Database type.
- Any other file is pure: it may not import the database, so it can be unit tested without one.

`src/db/` keeps only what is shared by all areas: the connection, the migrations, and the test-database helpers.

## Wiring: a factory receives the database

`createOperations({ db })` in `src/core/operations.ts` builds every operation, grouped by concept (`operations.allowlist.add(actor, email)`). The web app builds it once per server process; tests build it around their throwaway database. Each area's `create…Operations` function declares only the dependencies it uses.

## Failures: two kinds, handled differently

- **Expected failures** are ones a person can run into through a correct page: an email already on the allowlist, a handle already taken, a signup from an email not on the allowlist. The operation returns them as a `Result` (`{ ok: false, reason: "already-listed" }`), its return type names every possible reason, and TypeScript makes the page handle each one.
- **Permission refusals** are ones a correct page can never trigger, because it never offers the action: a non-Admin managing the allowlist, a Member editing another's Production. Reaching one means a bug or tampering, so the operation throws `PermissionRefusedError`, with reason `login-required` (a Visitor) or `not-permitted` (a Member lacking a role or ownership). The request fails fast and no caller can carry on as if the action had succeeded.

This matches Next.js's own guidance: model expected errors as return values, and throw for errors that should not occur in normal use.

## Consequences

- Lint rules enforce the layout: nothing in `src/core/` may import Next.js, React, pages, or UI components (ADR 0002), and only database files may import Drizzle, `pg`, or `src/db/`.
- One area will come to depend on another (Opinions on Catalog's Productions). When that starts, we expect to add a rule that areas import each other only through an `index.ts`.
- Deciding which kind a new failure is takes judgement. The test is whether a person using a correct page could cause it.
- When the repository splits into a monorepo, `src/core/` and `src/db/` become `packages/core`.
