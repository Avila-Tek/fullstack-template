import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  sourcemap: true,
  minify: true,
  splitting: false,
  clean: true,
  format: ['esm', 'cjs'],
  outDir: 'dist',
  target: ['node24'],
});
