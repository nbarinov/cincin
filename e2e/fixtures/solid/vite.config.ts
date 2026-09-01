import solid from 'vite-plugin-solid';
import { defineConfig } from 'vite';

const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [solid()],
  cacheDir: 'node_modules/.vite',
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 4275,
    strictPort: true,
    host: true,
  },
});
