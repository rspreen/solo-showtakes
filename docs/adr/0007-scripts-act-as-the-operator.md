# Scripts act as the operator, through ordinary operations

ADR 0002 sends every action through an operation that takes an Actor: a Visitor, or a Member with roles. Scripts run from a terminal have neither. The first is `pnpm admin:promote`, which makes the first Admin, a job no Member can do because no Admin exists yet. The City import and the merge script will follow. Whoever runs a script already holds the database credentials, so they could change anything with SQL. A permission check therefore protects nothing there. Still, scripts should share the website's rules and logging rather than duplicate them.

## Decision

A third kind of Actor, the **operator**, stands for whoever runs a script. Scripts pass it to the same operations the website uses (`operations.roles.grant(operator, email, "admin")`), so each rule, check, and log line exists once.

Every permission check treats the operator the same way (`src/core/shared/permissions.ts`):

- `requireRole` lets it through, whatever the role.
- `requireMember` refuses it, because those actions need a Member's own identity, such as rating as a particular Member. `requireVisitor` refuses it too.

Two guards keep the website from ever acting as the operator:

- The operator value lives in `src/core/shared/operator.ts`, and a lint rule forbids web code (`src/app`, `src/components`, `src/server`, `src/auth`, `src/instrumentation.ts`) from importing it.
- Every permission check refuses the operator when the code runs inside the Next.js server (which sets `NEXT_RUNTIME`). This catches one built by hand, which lint cannot see.

A script's log lines carry `operatorName`, the computer account that ran it, so its actions can be traced to a person.

## Alternatives considered

- **Plain functions without an Actor**, each script an exception to ADR 0002. Simpler at first, but each script's logic would sit outside the operations, and the admin screens would need a second copy of it.
- **Scripts act as a named Admin** (`--as you@example.com`). Log lines would name a Member, but the first Admin could not be made this way, and every run against a fresh database would need an Admin to exist first.

## Consequences

- A new permission check must decide how it treats the operator, following the rules above.
- Scripts live in `scripts/`, run with `tsx`, and build their services from the environment (`src/wiring/create-services-from-environment.ts`), as the website does.
