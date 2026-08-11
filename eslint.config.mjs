import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing Quizzt code intentionally uses effects for state synchronization
      // (auth/storage/data loading). Keep this as a warning until those flows can
      // be refactored independently from the AI-03 release.
      "react-hooks/set-state-in-effect": "warn",
      // Existing Supabase joins are not fully inferred by the generated client
      // types. Keep legacy boundary casts non-blocking; new code should avoid any.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
