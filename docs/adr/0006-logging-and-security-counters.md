# Events go to structured logs; the database keeps only counters that decisions need

Showtakes needs a record of what happened, for diagnosing faults and spotting abuse: failed logins, signups refused for an email not on the allowlist, and successful actions too. Some of those failures also have to change what the site does next, such as refusing more login attempts after too many failures.

## Decision

**Every event is logged, not stored in the database.** The log is the history of what happened. It is written with Pino, through a `Logger` interface that is passed in like the database and Mailer (no global logger), so tests can capture and check what was logged.

- Each line is one JSON object with a stable event name and fixed fields: `event` (such as `auth.login.failed` or `accounts.signup.refused`), `reason`, the email involved (also when it matches no Member), the IP address, user agent, Member id when known, and a request id that ties together the lines from one request.
- Levels separate the kinds: successes at `info`, refusals and failed logins at `warn`, faults at `error`. The `LOG_LEVEL` setting filters, so `warn` hides successful actions.
- The log goes to standard output. In development it is also written to `logs/showtakes.log`. In production the host's disk is temporary, so a log drain sends the output to a log service, which keeps, searches, and alerts on it.
- Passwords, tokens, cookies, and authorization headers are always redacted, using Pino's `redact` setting.
- The IP address comes only from the header the host sets, never from one a browser could forge.
- Better Auth's own log messages go to the same logger. A Better Auth after-hook logs the outcome of each login, logout, verification, and password reset (ADR 0005), and the signup operation logs its own outcomes, since it knows each refusal's reason.
- Operations receive a logger built for the request, already carrying its IP address and request id, as one of `createOperations`' dependencies. Operations are therefore built per request, which is cheap. The Actor stays "who" (ADR 0002). "From where" travels with the logger, and operation calls keep their Actor-first shape.

**The database keeps only the small counters the site acts on in real time**, which expire quickly:

- Rate-limit counters per IP address and endpoint, in our own `rate_limit_counter` table (`src/rate-limit/`), which Better Auth uses through its `customStorage` option and the signup server action uses directly. This replaces Better Auth's in-memory store, which each serverless instance would keep separately. (First planned as Better Auth's built-in `database` storage; changed so that one limiter serves both, since Better Auth's limiter never sees server actions.)
- A failed-login counter per account, which slows logins for that email for a while rather than locking the account.

Histories of attempts, such as which IP addresses failed against which account, are not kept in the database. Finding patterns in them is the log service's job.

## Consequences

- Questions like "how many failed logins from this IP address" are answered with the log service's search, not SQL.
- Logs contain emails and IP addresses, which are personal data. They need a retention limit (30 to 90 days) set at the log service, and a mention in the privacy policy.
- Pino's background-thread outputs ("transports") don't suit serverless hosting, so production writes plain standard output only.
- No hard lockouts: someone who knows a Member's email can slow that Member's logins, but cannot lock them out until they act.
- An admin "who changed what" history (moderation) is a different need from these logs. If it is wanted in the interface, it gets its own decision.
