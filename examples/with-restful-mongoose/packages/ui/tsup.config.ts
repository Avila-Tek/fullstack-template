import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  noExternal: ['slug'],
  format: ['cjs', 'esm'],
  splitting: true,
  sourcemap: true,
  dts: true,
  treeshake: true,
  target: 'esnext',
  outDir: 'dist',
  platform: 'node',
});
