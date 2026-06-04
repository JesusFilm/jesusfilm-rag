import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["node_modules/", "dist/", "migrations/"],
  },
  {
    // CommonJS config files (e.g. .dependency-cruiser.cjs) get module/require globals.
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Architecture dirs: cap file size to fight god-objects (docs/architecture.md §5.5).
    // Legacy bare-strip files (src/mcp, src/db, src root *.ts) are exempt until they
    // migrate into these dirs during build steps 2-6.
    files: [
      "src/contracts/**/*.ts",
      "src/registry/**/*.ts",
      "src/acquisition/**/*.ts",
      "src/ingestion/**/*.ts",
      "src/retrieval/**/*.ts",
      "src/adapters/**/*.ts",
      "src/fakes/**/*.ts",
      "src/serving/**/*.ts",
      "src/main.ts",
    ],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "warn",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Test files: a single `describe(...)` legitimately groups many `it(...)`
    // cases, so the 80-line cap fires on dense suites (slice #6: 4 test files
    // tripped it as warnings, 0 errors). The rule's intent — short focused
    // functions — is for production code; tests opt out. `max-lines` (file size)
    // still applies; only the per-function cap is disabled.
    files: ["**/*.test.ts"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
);
