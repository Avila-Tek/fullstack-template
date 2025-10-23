import 'dotenv/config';
// import { sentryEsbuildPlugin } from '@sentry/esbuild-plugin';
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
  // Temporarily disabled Sentry esbuild plugin to avoid module resolution issues in Docker
  // The plugin injects code that requires modules not available in the container
  // esbuildPlugins: [
  //   sentryEsbuildPlugin({
  //     org: 'avilatek',
  //     project: '',
  //     authToken: process.env.SENTRY_AUTH_TOKEN,
  //   }),
  // ],
});
