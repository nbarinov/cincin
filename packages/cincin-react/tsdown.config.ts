import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: 'esm',
  dts: { tsconfig: 'tsconfig.build.json' },
  clean: true,
  // One file per source module, so the 'use client' directives of
  // toaster/toaster.tsx and core/context.tsx reach dist: a bundled chunk
  // keeps only its entry's directive, and `css.inject` prepends its
  // import above even that one. The entry only re-exports, so it needs
  // no directive.
  unbundle: true,
  // The stylesheet goes through tsdown's CSS pipeline (Lightning CSS)
  // and lands in dist as an emitted asset; `inject` keeps the import in
  // the JS output, so consumers get the skin through their bundler with
  // the Toaster.
  css: { inject: true },
});
