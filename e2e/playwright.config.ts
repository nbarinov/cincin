import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

const APPS = {
  react: 'http://localhost:4273',
  solid: 'http://localhost:4275',
  vue: 'http://localhost:4276',
} as const;

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm dev:react',
      url: APPS.react,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev:solid',
      url: APPS.solid,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm dev:vue',
      url: APPS.vue,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'react-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: APPS.react },
    },
    {
      name: 'react-webkit',
      use: { ...devices['Desktop Safari'], baseURL: APPS.react },
    },
    {
      name: 'solid-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: APPS.solid },
    },
    {
      name: 'solid-webkit',
      use: { ...devices['Desktop Safari'], baseURL: APPS.solid },
    },
    {
      name: 'vue-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: APPS.vue },
    },
    {
      name: 'vue-webkit',
      use: { ...devices['Desktop Safari'], baseURL: APPS.vue },
    },
  ],
});
