import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [react()],
  cacheDir: 'node_modules/.vite',
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 4273,
    strictPort: true,
    host: true,
  },
});
