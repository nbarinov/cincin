import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'dom/index': 'src/dom/index.ts',
  },
  format: 'esm',
  dts: { tsconfig: 'tsconfig.build.json' },
  clean: true,
});
