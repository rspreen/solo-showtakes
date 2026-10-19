/**
 * ESLint configuration: automated code checks run by `pnpm lint` and in CI.
 *
 * Starts from Next.js's recommended rule sets, then adds two project rules
 * for `src/core/` (the business rules and operations; ADR 0002, ADR 0004):
 * - No file there may depend on the web framework or the UI.
 * - Only files whose name marks them as database code may touch the
 *   database; everything else in `src/core/` stays pure, so it can be unit
 *   tested without one.
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Imports forbidden everywhere in src/core. It holds the site's rules and
// must stay plain TypeScript so it can be tested without a browser and
// reused by future apps (scraper, public API).
const frameworkImportPatterns = [
  {
    group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
    message:
      "Code in src/core must not import Next.js or React (see ADR 0002).",
  },
  {
    group: [
      "@/app",
      "@/app/*",
      "@/components",
      "@/components/*",
      "@/shadcn",
      "@/shadcn/*",
    ],
    message:
      "Code in src/core must not import pages or UI components (see ADR 0002).",
  },
];

// Imports forbidden in the pure files of src/core: anything that reaches the
// database. Pure files hold rules that are functions of their inputs.
const databaseImportPatterns = [
  {
    group: ["drizzle-orm", "drizzle-orm/*", "pg", "@/db", "@/db/*"],
    message:
      "Only *.operations.ts, schema.ts, and integration tests in src/core may use the database (see ADR 0004).",
  },
];

// Files in src/core allowed to use the database.
const databaseFilesInCore = [
  "src/core/operations.ts",
  "src/core/**/*.operations.ts",
  "src/core/**/schema.ts",
  "src/core/**/*.integration.test.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Database files in src/core: framework rule only.
  {
    files: databaseFilesInCore,
    rules: {
      "no-restricted-imports": ["error", { patterns: frameworkImportPatterns }],
    },
  },
  // Every other file in src/core: framework and database rules. (A later
  // config replaces an earlier one's rule rather than merging, hence both
  // pattern lists here.)
  {
    files: ["src/core/**/*.{ts,tsx}"],
    ignores: databaseFilesInCore,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [...frameworkImportPatterns, ...databaseImportPatterns] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test output.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
