import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
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
  resolve: useSource ? { conditions: ['source'] } : {},
  server: {
    port: 5178,
    strictPort: true,
    host: true,
  },
});
