import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// The example follows whatever `cincin` resolves to. Inside the
// workspace that is a symlink to the package's own directory, sources
// included, and the "source" condition runs them straight from TypeScript
// with no build. Opened on its own — a StackBlitz link, a copy of the
// folder — it resolves to the published tarball, which ships dist and no
// src, so the condition has to stay off. DIST=1 forces that here too, to
// exercise the built packages the way consumers get them.
const packageDir = dirname(
  createRequire(import.meta.url).resolve('cincin/package.json')
);
const useSource =
  process.env.DIST === undefined && existsSync(join(packageDir, 'src'));

export default defineConfig({
  plugins: [vue()],
  resolve: useSource ? { conditions: ['source'] } : {},
  server: {
    port: 5176,
    strictPort: true,
    host: true,
  },
});
