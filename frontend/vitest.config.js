import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  // The component code uses the React 19 automatic JSX runtime, so
  // .jsx files don't `import React from 'react'`. Tell esbuild to
  // emit the same runtime when transforming for vitest.
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.{js,jsx}'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
