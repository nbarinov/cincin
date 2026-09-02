import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: 'esm',
  dts: { tsconfig: 'tsconfig.build.json' },
  clean: true,
  // The stylesheet goes through tsdown's CSS pipeline (Lightning CSS)
  // and lands in dist as an emitted asset; `inject` keeps the import in
  // the JS output, so consumers get the skin through their bundler with
  // the one entry import.
  css: { inject: true, fileName: 'toaster/styles.css' },
});
