import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // type-info rules (strict-boolean-expressions, prefer-nullish-coalescing,
      // prefer-optional-chain, no-floating-promises, return-await) require
      // parserServices and are intentionally omitted to keep linting simple.
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
  prettierRecommended,
);
