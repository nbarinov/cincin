import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  test: {
    name: 'react',
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['vitest.setup.ts'],
  },
});
