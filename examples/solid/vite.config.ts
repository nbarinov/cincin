import solid from 'vite-plugin-solid';
import { defineConfig } from 'vite';

// Follow the workspace "source" condition: the example runs on the
// library sources directly, no dist build required. Set DIST=1 to
// exercise the built packages instead, the way consumers get them —
// for cincin-solid that is the preserved-JSX artifact under the
// `solid` condition, compiled here by vite-plugin-solid.
const useDist = process.env.DIST !== undefined;

export default defineConfig({
  plugins: [solid()],
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
  },
});
