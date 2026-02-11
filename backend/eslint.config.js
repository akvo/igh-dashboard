import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["dist/", "node_modules/"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // Hard limits — block builds/CI
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", { max: 4 }],

      // Flags — visible but don't block
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  // Downgrade hard limits to warnings in test files
  {
    files: ["tests/**/*.ts"],
    rules: {
      complexity: ["warn", { max: 10 }],
      "max-depth": ["warn", { max: 4 }],
    },
  },
);
