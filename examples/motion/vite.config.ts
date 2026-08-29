import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Follow the workspace "source" condition: the example runs on the
// library sources directly, no dist build required. Set DIST=1 to
// exercise the built packages instead, the way consumers get them.
const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [react()],
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 5177,
    strictPort: true,
    host: true,
  },
});
