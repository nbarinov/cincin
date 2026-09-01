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
    include: ['src/**/*.test.ts'],
  },
});
