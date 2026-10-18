/**
 * Every database table, gathered from the areas of `src/core/`.
 *
 * Tables are defined next to the code that uses them (`src/core/<area>/
 * schema.ts`, ADR 0004). This file re-exports them all so that drizzle-kit
 * (drizzle.config.ts) sees the whole database when generating migrations,
 * and `client.ts` can give the Database type knowledge of every table.
 * Add one line here when an area gets its first table.
 *
 * Imports are relative, not `@/`, because drizzle-kit loads this file
 * outside the app's build and does not know the `@/` alias.
 */
export * from "../core/people/schema";
