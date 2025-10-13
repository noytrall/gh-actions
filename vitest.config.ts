/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // use describe/it/expect without import
    reporters: ['default', 'html'],
    outputFile: 'test/unit/index.html',
    clearMocks: true,
    environment: 'node', // use 'jsdom' for browser-like environment
    coverage: {
      // by default, but turned on when running hooks for git push
      provider: 'v8',
      enabled: true,
      include: ['src/**/*'],
      exclude: ['**/types.ts'],
      extension: ['.ts'],
      reportsDirectory: 'test/coverage',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        100: true,
      },
    },
  },
});
