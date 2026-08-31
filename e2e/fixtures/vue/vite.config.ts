import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [vue()],
  cacheDir: 'node_modules/.vite',
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 4276,
    strictPort: true,
    host: true,
  },
});
