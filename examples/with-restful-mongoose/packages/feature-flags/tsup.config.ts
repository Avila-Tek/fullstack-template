import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'shared/index': 'src/shared/index.ts',
    'api/index': 'src/api/index.ts',
    'web/index': 'src/web/index.ts',
  },
  dts: true,
  sourcemap: true,
  minify: true,
  splitting: false,
  clean: true,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  target: ['node20', 'deno2'],
});
