import { defineConfig } from 'vite';

// Follow the workspace "source" condition: the example runs on the
// library sources directly, no dist build required. Set DIST=1 to
// exercise the built packages instead, the way consumers get them.
// No Preact plugin: Vite's esbuild reads the JSX settings from
// tsconfig, and the sandbox does without fast refresh.
const useDist = process.env.DIST !== undefined;

export default defineConfig({
  resolve: useDist ? {} : { conditions: ['source'] },
  server: {
    port: 5178,
    strictPort: true,
    host: true,
  },
});
