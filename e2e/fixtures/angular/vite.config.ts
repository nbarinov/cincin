import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [angular()],
  cacheDir: 'node_modules/.vite',
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 4277,
    strictPort: true,
    host: true,
  },
});
