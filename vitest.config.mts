import { defineConfig } from 'vitest/config';
import Vue from 'unplugin-vue/vite';
import Solid from 'vite-plugin-solid';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          environment: 'node',
          globals: true,
          include: [
            'packages/cincin/src/core/**/*.test.ts',
            'packages/cincin/src/shared/**/*.test.ts',
            'packages/cincin/src/presenter/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'dom',
          environment: 'jsdom',
          globals: true,
          include: ['packages/cincin/src/dom/**/*.test.ts'],
          setupFiles: ['packages/cincin/src/dom/test-setup.ts'],
        },
      },
      {
        resolve: {
          // Follow the "source" condition of workspace packages: tests must
          // exercise the core source, not a stale dist build.
          conditions: ['source'],
        },
        test: {
          name: 'react',
          environment: 'jsdom',
          globals: true,
          include: ['packages/cincin-react/src/**/*.test.{ts,tsx}'],
        },
      },
      {
        plugins: [Vue()],
        resolve: {
          conditions: ['source'],
        },
        test: {
          name: 'vue',
          environment: 'jsdom',
          globals: true,
          include: ['packages/cincin-vue/src/**/*.test.ts'],
        },
      },
      {
        // `hot: false` keeps the solid-refresh HMR shim out: it is a
        // virtual module that resolves solid-js from the workspace
        // root, where the dependency does not exist.
        plugins: [Solid({ hot: false })],
        resolve: {
          // An explicit list displaces Vite's defaults, so solid-js
          // needs steering back: `browser` picks the client build under
          // jsdom (the server build renders static markup and
          // reactivity silently dies), `development` picks the dev
          // build whose $DEVCOMP the testing library imports.
          conditions: ['source', 'browser', 'development'],
        },
        test: {
          name: 'solid',
          environment: 'jsdom',
          globals: true,
          include: ['packages/cincin-solid/src/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
