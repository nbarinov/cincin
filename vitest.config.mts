import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          environment: 'node',
          globals: true,
          include: ['packages/cincin/src/**/*.test.ts'],
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
    ],
  },
});
