import { defineConfig, defineProject } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: 'core',
          environment: 'node',
          globals: true,
          restoreMocks: true,
          clearMocks: true,
          include: [
            'src/core/**/*.test.ts',
            'src/shared/**/*.test.ts',
            'src/presenter/**/*.test.ts',
          ],
        },
      }),
      defineProject({
        test: {
          name: 'dom',
          environment: 'jsdom',
          globals: true,
          restoreMocks: true,
          clearMocks: true,
          include: ['src/dom/**/*.test.ts'],
          setupFiles: ['vitest.setup.ts'],
        },
      }),
    ],
  },
});
