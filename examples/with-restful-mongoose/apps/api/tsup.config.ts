import 'dotenv/config';
import { sentryEsbuildPlugin } from '@sentry/esbuild-plugin';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: ['cjs'],
  platform: 'node',
  splitting: false,
  clean: true,
  sourcemap: true,
  target: 'node24',
  shims: true,
  bundle: true,
  dts: false,
  skipNodeModulesBundle: true,
  esbuildPlugins: [
    sentryEsbuildPlugin({
      org: 'avilatek',
      project: '',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
