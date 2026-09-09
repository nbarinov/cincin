import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Sources where they exist, published dist where they do not: the
// workspace symlink carries src, a copy of this folder does not.
// DIST=1 forces dist here too.
const packageDir = dirname(
  createRequire(import.meta.url).resolve('cincin/package.json')
);
const useSource =
  process.env.DIST === undefined && existsSync(join(packageDir, 'src'));

export default defineConfig({
  plugins: [react()],
  resolve: useSource ? { conditions: ['source'] } : {},
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
});
