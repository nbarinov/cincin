import { defineConfig } from 'vitest/config';
import Vue from 'unplugin-vue/vite';

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
    ],
  },
});
