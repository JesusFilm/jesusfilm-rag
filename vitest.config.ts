import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    // src/** = fakes-only unit tests; tests/** = composition-level integration
    // tests that wire a real adapter into a context (the import law confines that
    // to outside src/ — see tests/retrieval.integration.test.ts).
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
