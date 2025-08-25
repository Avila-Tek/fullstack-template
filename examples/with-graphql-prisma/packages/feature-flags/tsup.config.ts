import { defineConfig } from 'tsup';

export default defineConfig([
  // API and shared entries - server-side
  {
    entry: {
      'shared/index': 'src/shared/index.ts',
      'api/index': 'src/api/index.ts',
    },
    outDir: 'dist',
    format: ['cjs'],
    platform: 'node',
    splitting: false,
    clean: true,
    sourcemap: true,
    target: 'node20',
    shims: true,
    bundle: true,
    skipNodeModulesBundle: true,
    tsconfig: 'tsconfig.api.json',
  },
  // Web entry - client-side with 'use client' preservation
  {
    entry: {
      'web/index': 'src/web/index.ts',
    },
    noExternal: ['slug'],
    format: ['cjs', 'esm'],
    splitting: true,
    sourcemap: true,
    dts: true,
    treeshake: true,
    target: 'esnext',
    outDir: 'dist',
    platform: 'node',
    tsconfig: 'tsconfig.web.json',
  },
]);
