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
