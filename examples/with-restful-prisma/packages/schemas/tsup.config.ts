import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  sourcemap: true,
  minify: true,
  splitting: false,
  clean: true,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  target: ['node20', 'deno2'],
});
