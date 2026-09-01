import { defineConfig } from 'tsdown';
import solid from '@rolldown-plugin/solid';

// Two artifacts, per the Solid ecosystem convention: a DOM-compiled
// ESM build for plain `import`, and the same modules with JSX left
// intact under the `solid` export condition, so the consumer's own
// Solid compiler targets DOM or SSR itself. The core entry carries no
// JSX, but rides both passes for a uniform exports map.
export default defineConfig([
  {
    entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
    format: 'esm',
    plugins: [solid()],
    dts: { tsconfig: 'tsconfig.build.json' },
    clean: true,
    // The stylesheet goes through tsdown's CSS pipeline (Lightning CSS)
    // and lands in dist as an emitted asset; `inject` keeps the import in
    // the JS output, so consumers get the skin through their bundler with
    // the one entry import.
    css: { inject: true, fileName: 'toaster/styles.css' },
  },
  {
    entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
    format: 'esm',
    dts: false,
    clean: false,
    // JSX survives untouched: rolldown honors the tsconfig's
    // `jsx: preserve`, so this pass only strips types and bundles.
    outExtensions: () => ({ js: '.jsx' }),
    css: { inject: true, fileName: 'toaster/styles.css' },
  },
]);
