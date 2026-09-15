import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'],
  },
  server: {
    port: 5185,
    strictPort: true,
    host: true,
  },
});
