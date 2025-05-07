import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    hookTimeout: 5 * 60 * 1000,
  },
});
