import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/mastra/swarm/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/examples/**'],
    },
    // Timeout for async tests
    testTimeout: 10000,
    // Hooks for cleaner output
    reporters: ['default'],
    // Watch mode off by default
    watch: false,
  },
});