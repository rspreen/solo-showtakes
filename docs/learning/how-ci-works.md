# How CI works on GitHub

A guide to what happens between `git push` and the green tick (or red cross) beside a commit on GitHub, written for this repository as it stands in October 2026.

**CI** (continuous integration) means: every time code is pushed, a clean machine checks it out and runs every check from scratch. It answers one question: "does this exact commit work, on a machine that has never seen it before?" That catches the class of bug that only works on your Mac because of something left over there: an uncommitted file, a setting in `.env`, a package installed by hand, a database already migrated.

## The big picture

```
git push
  -> GitHub receives the commits
  -> GitHub looks in that commit for .github/workflows/*.yml
  -> each workflow whose "on:" matches the event starts a "run"
  -> each job in the run gets a fresh virtual machine (a "runner")
  -> the runner starts the job's service containers (Postgres, Mailpit)
  -> the runner executes the job's steps, top to bottom, stopping at the first failure
  -> the result is attached to the commit as a "check" (tick or cross)
  -> the machine is thrown away
```

Vocabulary used below:

| Term | Meaning |
|---|---|
| **Workflow** | One YAML file in `.github/workflows/`. Ours is `ci.yml`, named "CI". |
| **Event** | What starts a workflow: a push, a pull request, a schedule, a button press. |
| **Run** | One execution of a workflow for one event. Each has a number and a page under the repository's **Actions** tab. |
| **Job** | A group of steps that run on one machine. Ours has one job, `check`. Several jobs would run in parallel on separate machines. |
| **Step** | One command (`run:`) or one reusable **action** (`uses:`) inside a job. |
| **Action** | A packaged, versioned step someone else wrote, such as `actions/checkout@v7`. The `@v7` is the version. |
| **Runner** | The virtual machine that executes a job. GitHub-hosted runners are fresh Ubuntu machines in Microsoft Azure, used once and deleted. |
| **Service container** | A Docker container started beside the job for it to talk to, here Postgres and Mailpit. |
| **Check** | The pass/fail result GitHub shows beside a commit or pull request. |

## Which files guide it

GitHub itself reads only one file: `.github/workflows/ci.yml`. Everything else is read by the tools that `ci.yml` runs. Following the chain:

| File | Read by | What it decides |
|---|---|---|
| `.github/workflows/ci.yml` | GitHub | When CI runs, on what machine, which services, which steps, in what order |
| `.node-version` | `actions/setup-node` | Which Node.js version (24) |
| `package.json` (`packageManager`) | `pnpm/action-setup` | Which pnpm version (12.11.2) |
| `package.json` (`scripts`) | pnpm | What `pnpm lint`, `pnpm test`, and so on actually run |
| `pnpm-lock.yaml` | pnpm, and the cache | The exact version of every package; also the cache key |
| `pnpm-workspace.yaml` | pnpm | Supply-chain rules: the 7-day minimum package age, and which packages may run install scripts |
| `eslint.config.js` | ESLint | Code rules, including our architecture boundaries |
| `tsconfig.json` | TypeScript | How strict the type check is |
| `drizzle.config.ts` | drizzle-kit | Where migrations are and which database to apply them to |
| `src/db/migrations/` | drizzle-kit, tests | The SQL that builds the tables |
| `vitest.config.ts` | Vitest | Which files are unit tests and which are integration tests |
| `src/db/testing/global-setup.ts` | Vitest | Creates and later drops the throwaway test database |
| `next.config.ts` | Next.js | How the site is built |
| `playwright.config.ts` | Playwright | How the browser tests start the site and which browser they use |
| `e2e/global-setup.ts` | Playwright | Creates and migrates the browser-test database |

A useful property: the workflow file is read **from the commit being tested**. Changing CI is an ordinary commit, reviewed and versioned like code, and an old commit is always tested with the CI it was written for.

Files CI never reads: `.env` (git-ignored, so it does not exist on the runner; `ci.yml` supplies the same settings instead), and anything else that is not committed. That is the point: if it is not in git, CI cannot see it, and neither can Vercel.

## Step by step

The real step names from a recent run, in order, with what each one does, which file guides it, and what a failure would mean.

### 0. The trigger

```yaml
on:
  push:
  pull_request:
```

Any push to any branch starts a run, and so does opening or updating a pull request. A pull request from a branch in this same repository therefore runs CI twice (once for the push, once for the pull request); harmless, just duplicate work.

GitHub also sets the setting `CI=true` on every runner. Several tools notice it and behave more strictly; Playwright is one (below).

### 1. Set up job

GitHub picks a machine matching `runs-on: ubuntu-latest`. The log shows what it got: Ubuntu 24.04, in Azure. `ubuntu-latest` is a moving label: GitHub is moving it to Ubuntu 26 from 19 October 2026, so the operating system can change under us without any commit of ours. Pinning `runs-on: ubuntu-24.04` would make that an explicit change instead.

`timeout-minutes: 15` kills the job if it runs longer, so a hung test cannot burn the free minutes allowance for hours. A normal run takes about 2 minutes.

The `env:` block at the job level sets the same settings `.env.example` documents (`DATABASE_URL`, `MAIL_PROVIDER`, and so on) for every step. `BETTER_AUTH_SECRET` there is a test-only value; the repository is public, so a real secret must never appear in this file. (Real secrets would go in GitHub's encrypted **Secrets** settings and be referenced as `${{ secrets.NAME }}`; CI needs none today.)

### 2. Initialize containers

```yaml
services:
  postgres: image: postgres:17.11-alpine3.24 ...
  mailpit:  image: axllent/mailpit:v1.31.4 ...
```

The runner downloads and starts the same two containers `compose.yaml` runs on your Mac, with the same exact image versions and ports, so tests see the same database and mail server as locally. The `--health-cmd "pg_isready ..."` options make GitHub wait until Postgres actually accepts connections before any step starts; without that, the first test could hit a database that is still starting up.

The versions are pinned to exact tags (`17.11-alpine3.24`, not `17` or `latest`) so an upstream release cannot change CI's behaviour on its own. The comment in `ci.yml` says to change them together with `compose.yaml`.

### 3. `actions/checkout@v7`

Clones the repository at exactly the pushed commit into the runner. Only that one commit, not the whole history, which is all the checks need.

### 4. `pnpm/action-setup@v6`

Installs pnpm. With no version given in `ci.yml`, it reads `"packageManager": "pnpm@12.11.2"` from `package.json`, the same field Vercel's Corepack uses. One place sets the pnpm version for your Mac, CI, and Vercel.

### 5. `actions/setup-node@v7`

Installs Node.js, the version in `.node-version` (24). `package.json`'s `engines` says the same for Vercel; the README says to change both together.

`cache: pnpm` speeds up the next step. After a successful run (the "Post Run actions/setup-node" step at the end), it saves pnpm's package store, labelled with a fingerprint of `pnpm-lock.yaml`. The next run with an unchanged lockfile restores it instead of downloading every package again. Change a dependency, and the fingerprint changes, so the cache starts fresh.

### 6. `pnpm install --frozen-lockfile`

Installs every package at the exact version recorded in `pnpm-lock.yaml`.

- `--frozen-lockfile` fails if `package.json` and `pnpm-lock.yaml` disagree, for example if you added a package to `package.json` by hand and forgot to run `pnpm install`. CI never quietly resolves different versions from the ones you tested.
- `pnpm-workspace.yaml` applies the supply-chain rules here too: `minimumReleaseAge` (refuse any package version published less than 7 days ago, because most malicious releases are caught and pulled within days), and `allowBuilds` (no package may run its own install script unless listed as allowed). The Vercel build log shows the same check: "Lockfile passes supply-chain policies".

**Checks:** the lockfile is consistent, and every package passes the supply-chain rules.

### 7. `pnpm lint`

Runs ESLint over the code, guided by `eslint.config.js`:

- Next.js's recommended rules (React hook mistakes, accessibility basics, Next.js pitfalls).
- Our architecture rules, which turn the ADRs into errors:
  - `src/core/` may not import Next.js, React, or UI code (ADR 0002).
  - Only `*.operations.ts`, `schema.ts`, and integration tests in `src/core/` may touch the database (ADR 0004).
  - Web code may not import the operator Actor (ADR 0007).

**Checks:** style and correctness rules, and that the architecture's boundaries hold.

### 8. `pnpm typecheck`

Runs `next typegen && tsc --noEmit`:

- `next typegen` generates types Next.js knows about from the folder layout, such as `PageProps<"/">`, so pages are checked against the real routes.
- `tsc --noEmit` type-checks every file without producing any output (`noEmit`), guided by `tsconfig.json`: `strict` mode, plus extra strictness such as `noUncheckedIndexedAccess` (reading `list[0]` might be `undefined`, so the code must handle that).

**Checks:** every value is used as its type allows, across the whole codebase, including tests and scripts.

### 9. `pnpm db:migrate`

Runs `drizzle-kit migrate`, guided by `drizzle.config.ts`: applies every file in `src/db/migrations/` to the empty `showtakes` database in the Postgres service.

**Checks:** the committed migrations apply cleanly, in order, to a brand-new database. This is exactly what production's first deploy will do (ADR 0008), so a broken migration fails here first.

### 10. `pnpm test`

Runs Vitest, guided by `vitest.config.ts`, which splits tests into two projects:

- **unit** (`*.test.ts`): pure code, no database: handle rules, password rules, permission checks, the logger's redaction.
- **integration** (`*.integration.test.ts`): before they start, `src/db/testing/global-setup.ts` creates a new database with a unique name, applies the migrations, and hands its address to the tests. They run real operations against real Postgres (signup, the allowlist, roles), check that emails arrive in Mailpit, and run the `admin:promote` script as a separate process. At the end, the database is dropped.

**Checks:** the business rules and operations behave as specified, including permission refusals, against a real database.

### 11. `pnpm build`

Runs `next build`, guided by `next.config.ts`: compiles the site for production, type-checks again, and prerenders the parts of each page that do not depend on the request.

This step runs with every runtime setting blanked (`DATABASE_URL: ""` and the rest), as on Vercel, where secrets may be missing at build time. If any page reaches the database or a secret while it is being prebuilt, the build fails here instead of on Vercel. (That exact bug happened on the first Vercel deploy; see `src/server/actor.ts`.)

**Checks:** the production build succeeds without any secrets.

### 12. `pnpm exec playwright install --with-deps chromium`

Downloads the Chromium browser that Playwright drives, plus the Linux system libraries it needs (`--with-deps`). Only Chromium for now; `playwright.config.ts` notes Firefox and WebKit are to be added before public launch.

### 13. `pnpm test:e2e`

Runs Playwright, guided by `playwright.config.ts`. Because `CI=true`:

- It starts the **production build** from step 11 (`pnpm start`), not the development server, on port 3100. Here the server gets the real settings again, because a Next.js server reads its settings when it starts. It uses its own database, `showtakes_e2e`, created and migrated by `e2e/global-setup.ts`, and logs to `logs/e2e.log`.
- `forbidOnly`: fails if a test was left marked `test.only` (a debugging shortcut that silently skips every other test).
- `retries: 1`: a failed test is tried once more, to tell a flaky test from a broken one; Playwright reports which was which.
- Two reporters: `github` turns results into annotations on the run's page (the "3 passed" line in the run summary), and `html` writes a browsable report to `playwright-report/`, including screenshots and traces of failed tests.

The tests drive a real browser through the site as a person would: sign up from an allowlisted email, follow the verification link from Mailpit, log in and out, reset the password, and check that a refused signup or failed login writes a warning to the log file with the email and IP address.

**Checks:** the whole system works end to end, in a real browser, from the production build.

### 14. Upload the Playwright report (only on failure)

```yaml
- uses: actions/upload-artifact@v7
  if: failure()
```

`if: failure()` makes this step run only when an earlier step failed (normally a failure skips every later step). It saves `playwright-report/`, the `html` reporter's output, as a downloadable **artifact** on the run's page for 7 days. Download it, unzip it, and run `pnpm exec playwright show-report <folder>` to see each failed test's screenshots and a trace: a step-by-step recording of the page you can scrub through, as if replaying the failure.

(Until October 2026 this uploaded nothing, because CI used only the `github` reporter, which writes no files.)

### 15. Post Run steps, Stop containers, Complete job

The actions tidy up (setup-node saves the pnpm cache), the service containers stop, and GitHub records the result. The machine is then deleted; nothing carries over to the next run except the cache.

## How the result reaches you

- **The tick or cross** beside the commit on GitHub, in the repository's commit list, and on any pull request.
- **An email** from GitHub when a run you triggered fails (adjustable under your GitHub notification settings).
- **The Actions tab**, or from the terminal:

```sh
gh run list --limit 5          # recent runs and their status
gh run watch                   # follow a run live
gh run view <run id> --log     # the full log of every step
gh run view <run id> --log-failed   # only the steps that failed
```

A step "fails" when its command exits with a non-zero code, which every test runner and checker does when something is wrong. Each `run:` step runs in `bash -e`, so the first failing command ends the step.

## What makes this CI worth having

Each setting and why it is there:

| Setting | Where | What it protects against |
|---|---|---|
| Runs on every push to every branch | `ci.yml` `on:` | A broken commit going unnoticed |
| Fresh machine each time | GitHub | "Works on my machine" because of leftovers |
| Same service images and ports as local | `ci.yml` `services:`, `compose.yaml` | Tests passing locally but not in CI, or the reverse |
| Health check on Postgres | `ci.yml` `options:` | Random failures from a database still starting |
| Node and pnpm versions read from files | `.node-version`, `packageManager` | CI, your Mac, and Vercel drifting apart |
| `--frozen-lockfile` | `ci.yml` | Untested package versions slipping in |
| Supply-chain rules | `pnpm-workspace.yaml` | Freshly published malicious packages, rogue install scripts |
| Architecture lint rules | `eslint.config.js` | The ADR boundaries eroding one import at a time |
| Strict type checking | `tsconfig.json` | Whole classes of runtime errors, such as unhandled `undefined` |
| Migrations applied to an empty database | `ci.yml` step | A migration that only works on your already-migrated database |
| Throwaway databases per run | `src/db/testing/global-setup.ts` | Tests depending on leftover data, or on each other |
| Build with settings blanked | `ci.yml` build step | A page needing secrets at build time (the first Vercel failure) |
| Browser tests against the production build | `playwright.config.ts` | Bugs that appear only in production mode |
| `forbidOnly`, one retry | `playwright.config.ts` | A forgotten `test.only`; flaky tests mistaken for real failures |
| Exact image tags and action versions | `ci.yml` | Upstream releases changing CI behind our backs |
| `timeout-minutes: 15` | `ci.yml` | A hung run consuming free minutes |
| No real secrets in the file | `ci.yml` | Leaking credentials from a public repository |

## Gaps: what CI does not do today

These are known, not oversights to panic about; each is a decision for later.

1. **CI does not block anything.** `main` has no branch protection, and Vercel builds and deploys every push on its own, in parallel with CI and regardless of its result. A red cross today is a warning, not a gate. Options when that matters: require pull requests with passing checks before merging to `main` (GitHub branch protection or rulesets), and have Vercel wait for GitHub's checks before a deployment becomes production (Vercel has a setting for this; check its current name in the project settings).
2. **`ubuntu-latest` moves on its own.** Pin `ubuntu-24.04` to choose when to upgrade.
3. **Chromium only.** Firefox and WebKit (Safari's engine) are planned before public launch.
4. **No dependency update or vulnerability alerts.** GitHub's Dependabot can open pull requests for outdated or vulnerable packages; it would need to respect the 7-day minimum age.
5. **The action versions (`@v7`) are tags, which their owners can move.** Pinning each to a full commit hash is the stricter supply-chain practice; tags are the common, convenient one.

## Relation to Vercel

CI and Vercel are separate systems that both react to the same push:

```
git push ──> GitHub Actions: lint, types, migrations, tests, build, browser tests  (checks only)
        └──> Vercel: migrate the real database, build, deploy  (ADR 0008)
```

CI proves the commit is correct; Vercel puts it live. Neither waits for the other today (gap 1). CI never touches the real Neon database; it only ever uses its own throwaway Postgres.
