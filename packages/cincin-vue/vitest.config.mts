import { defineConfig } from 'vitest/config';
import Vue from 'unplugin-vue/vite';

export default defineConfig({
  plugins: [Vue()],
  resolve: {
    conditions: ['source'],
  },
  test: {
    name: 'vue',
    environment: 'jsdom',
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['vitest.setup.ts'],
  },
});
