import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setupFile.ts'],
    // min * sec * mil-sec
    hookTimeout: 15 * 60 * 1000,
  },
});
