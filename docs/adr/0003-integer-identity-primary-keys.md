# Integer identity primary keys

Every table that needs a surrogate key uses an auto-incremented 64-bit integer, declared as `bigint generated always as identity`. We chose this over UUIDs because integer keys are half the size, keep each new row at the end of its index instead of scattering inserts across it, and are easier to read when debugging. Time-ordered UUIDs (version 7) would remove most of the insertion cost, but not the size or readability cost, and we have no need to generate ids outside the database.

## Consequences

- Use `generated always as identity`, not `serial`; it is the current Postgres form and stops code from writing ids by hand. Use `bigint`, not `integer`, so the sequence can never run out.
- Tables that record a relationship between two things (a Rating, a Like, a Follow) have no id of their own. Their primary key is the pair of foreign keys, such as `(member_id, production_id)`, which also enforces "at most one per Member".
- A table may use a natural key when the value is already unique, never changes meaning, and nothing joins to the table. `allowlist_entry`, keyed by email, is the one such table today.
- Sequential ids reveal how many rows exist and let anyone walk through them by counting. Public URLs therefore identify things by handle or a readable slug (for example `/productions/1234-hamilton-...`), not by an id alone, and nothing may rely on an id being secret.
- Better Auth (ticket 5) generates text ids by default and must be configured to use numeric ids, so that Members follow this rule too. The exact setting is to be confirmed in Better Auth's documentation during ticket 5.
