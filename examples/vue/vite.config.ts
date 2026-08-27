import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Follow the workspace "source" condition: the example runs on the
// library sources directly, no dist build required. Set DIST=1 to
// exercise the built packages instead, the way consumers get them.
const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [vue()],
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 5176,
    strictPort: true,
    host: true,
  },
});
