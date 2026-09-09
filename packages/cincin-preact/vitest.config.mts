import { defineConfig, defineProject } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  ssr: {
    resolve: {
      conditions: ['source'],
    },
  },
  test: {
    projects: [
      defineProject({
        resolve: {
          conditions: ['source'],
        },
        test: {
          name: 'preact',
          environment: 'jsdom',
          globals: true,
          restoreMocks: true,
          clearMocks: true,
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.server.test.{ts,tsx}'],
          setupFiles: ['vitest.setup.ts'],
        },
      }),
      defineProject({
        resolve: {
          conditions: ['source'],
        },
        ssr: {
          resolve: {
            conditions: ['source'],
          },
        },
        test: {
          name: 'preact-server',
          environment: 'node',
          globals: true,
          restoreMocks: true,
          clearMocks: true,
          include: ['src/**/*.server.test.{ts,tsx}'],
        },
      }),
    ],
  },
});
