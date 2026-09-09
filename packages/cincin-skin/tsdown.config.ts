import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: 'esm',
  dts: { tsconfig: 'tsconfig.build.json' },
  clean: true,
});
