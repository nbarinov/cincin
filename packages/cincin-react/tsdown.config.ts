import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: 'esm',
  dts: { tsconfig: 'tsconfig.build.json' },
  clean: true,
  // The stylesheet import stays external and verbatim in the output;
  // the file itself is copied next to the entry (`to` is a directory),
  // so the consumer's bundler resolves and processes it.
  external: [/\.css$/],
  copy: [{ from: 'src/toaster/styles.css', to: 'dist/toaster' }],
  outputOptions: {
    banner: "'use client';",
  },
});
