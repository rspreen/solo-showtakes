/**
 * ESLint configuration: automated code checks run by `pnpm lint` and in CI.
 *
 * Starts from Next.js's recommended rule sets, then adds one project rule:
 * the domain and operations layers must not depend on the web framework.
 * See docs/adr/0002-internal-operations-layer.md for why.
 */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Imports forbidden inside src/domain and src/operations. Those layers hold
// the site's rules and must stay plain TypeScript so they can be tested
// without a browser and reused by future apps (scraper, public API).
const frameworkImportPatterns = [
  {
    group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
    message:
      "Domain and operations code must not import Next.js or React (see ADR 0002).",
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
      "Domain and operations code must not import pages or UI components (see ADR 0002).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/operations/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: frameworkImportPatterns }],
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
