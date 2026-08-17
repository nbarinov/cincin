import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    // Follow the workspace "source" condition: the example runs on the
    // library sources directly, no dist build required.
    conditions: ['source'],
  },
  server: {
    strictPort: true,
    // Expose on the LAN so the example can be tested from a phone.
    host: true,
  },
});
