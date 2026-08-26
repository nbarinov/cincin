import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The site is a consumer, not a harness: it builds against the packages
// the way npm ships them (no "source" condition), so a broken exports
// map or a missing stylesheet fails here before it fails for users.
// The react example keeps the source-condition dev loop.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
  },
});
