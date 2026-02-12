import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Run tests in Node.js environment
    environment: "node",

    // Increase timeout for E2E tests that hit real DB
    testTimeout: 30000,

    // Include TypeScript files
    include: ["tests/**/*.test.ts"],

    // Point all tests at the static test database
    env: {
      DATABASE_PATH: path.resolve(__dirname, "tests/star_schema.db"),
    },

    // Ensure ESM support
    alias: {
      // Map imports to source files
    },
  },
});
