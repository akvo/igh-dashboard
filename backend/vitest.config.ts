import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests in Node.js environment
    environment: "node",

    // Increase timeout for E2E tests that hit real DB
    testTimeout: 30000,

    // Include TypeScript files
    include: ["tests/**/*.test.ts"],

    // Ensure ESM support
    alias: {
      // Map imports to source files
    },
  },
});
