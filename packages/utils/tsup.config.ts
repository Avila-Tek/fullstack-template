import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  minify: true,
  splitting: false,
  clean: true,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  target: ['node24'],
});
