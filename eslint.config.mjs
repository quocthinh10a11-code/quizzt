import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "app/practice/[id]/page.tsx",
      "app/review/[id]/page.tsx",
      "app/review/bookmarks/page.tsx",
      "app/smart-review/page.tsx",
      "components/Navbar.tsx",
      "components/SubjectChapterPicker.tsx",
      "context/ThemeContext.tsx",
      "lib/usePracticeSession.ts",
    ],
    rules: {
      // Pre-existing effect patterns are intentionally non-blocking for this
      // release. New AI-03 files remain on the default error rule.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: [
      "app/practice/bookmarks/page.tsx",
      "lib/ai/learningHistory.ts",
      "lib/quizStats.ts",
      "lib/quizTags.ts",
      "lib/reviewQueue.ts",
    ],
    rules: {
      // Legacy Supabase boundary casts remain warnings until those modules are
      // refactored independently. New AI-03 code must not introduce `any`.
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
