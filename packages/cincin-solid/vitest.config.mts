import { defineConfig } from 'vitest/config';
import Solid from 'vite-plugin-solid';

export default defineConfig({
  // `hot: false` keeps the solid-refresh HMR shim out: it is a
  // virtual module that resolves solid-js from outside the package,
  // where the dependency does not exist.
  plugins: [Solid({ hot: false })],
  resolve: {
    // An explicit list displaces Vite's defaults, so solid-js needs
    // steering back: `source` exercises the workspace sources,
    // `browser` picks the client build under jsdom (the server build
    // renders static markup and reactivity silently dies), and
    // `development` picks the dev build whose $DEVCOMP the testing
    // library imports.
    conditions: ['source', 'browser', 'development'],
  },
  test: {
    name: 'solid',
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
