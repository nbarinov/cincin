import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    conditions: ['source'],
  },
  test: {
    name: 'angular',
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['vitest.setup.ts'],
  },
});
