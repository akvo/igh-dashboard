import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [
    // Some `src` .js files (e.g. exploreColumnConfig.js) contain JSX in their
    // render fields. Vite's import-analysis rejects JSX in .js files before
    // esbuild can transform them, so pre-transform every `src/**/*.js` through
    // esbuild's jsx loader (a superset of plain JS — non-JSX files pass through
    // unchanged). Path-gated recipe from the Vite docs.
    {
      name: 'treat-js-as-jsx',
      async transform(code, id) {
        if (!id.match(/\/src\/.*\.js$/) || id.includes('node_modules')) return null;
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
      },
    },
  ],
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
