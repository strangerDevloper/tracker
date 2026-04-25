import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // ADR-0008: lib/finance/** MUST be pure — no DB imports.
    // If this rule fires, do not suppress; refactor the caller so the DB
    // query happens outside lib/finance/ and passes pre-fetched data in.
    files: ["lib/finance/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/db/*", "@prisma/client"],
              message:
                "lib/finance/* must stay pure — no DB imports (ADR-0008). Refactor the caller to pass data in.",
            },
          ],
        },
      ],
    },
  },
  {
    // Fixture files for tests (not linted as production code)
    files: ["**/*.fixture.ts", "**/*.fixture.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "coverage/",
      "playwright-report/",
      "test-results/",
      "bmad/",
    ],
  },
];

export default eslintConfig;
