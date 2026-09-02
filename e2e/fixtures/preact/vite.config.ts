import { defineConfig } from 'vite';

const useDist = process.env.DIST !== undefined;

// No Preact plugin: Vite's esbuild reads the JSX settings from tsconfig.
export default defineConfig({
  cacheDir: 'node_modules/.vite',
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 4274,
    strictPort: true,
    host: true,
  },
});
