# Migrations run in the Vercel build

The site's tables change through the SQL migration files in `src/db/migrations/`. Locally and in CI, `pnpm db:migrate` applies them. Production on Vercel and Neon needs the same step, and each preview deployment has its own Neon branch (a copy of the production database) that needs a branch's new migrations too.

## Decision

Vercel's build command is `pnpm db:migrate && pnpm build`, set in `vercel.json`. Every deployment migrates its own database before building: production migrates production, and a preview migrates its preview branch, because the Neon integration gives each one its own `DATABASE_URL`. A failed migration stops the deploy, and the running site keeps its previous version.

Migrations connect through Neon's direct address (`DATABASE_URL_UNPOOLED`), as Neon advises for schema changes; the site itself uses the pooled address (`drizzle.config.ts`).

The build of the pages themselves never needs the database (CI checks this by building with every setting blank); only the migration step before it does.

## Alternatives considered

- **A GitHub Actions job** migrates, then triggers the deploy. A separate visible step, but production database credentials would be stored in GitHub, and preview branches would need their own wiring.
- **By hand from a Mac** before merging. Nothing to build, but easy to forget, and the laptop holds production credentials.

## Consequences

- A migration must work with the code that is already running, because it is applied a little before the new code goes live, and stays applied if the build then fails. Make changes in two deploys: add first, remove later. To rename a column, add the new one and deploy, then drop the old one in a later deploy.
- There is no "down" migration. A bad migration is undone by Neon's restore (a 7-day window on the Launch plan; see the "Backups" ticket).
- A deploy fails while Neon is unreachable. The running site is unaffected.
- Two deploys building at the same moment could both try to migrate production. Unlikely for one developer; if it happens, the second fails and is redeployed.
