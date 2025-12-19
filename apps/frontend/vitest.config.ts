import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    // Disable watch mode in CI environments
    watch: process.env.CI ? false : undefined,
  },
  resolve: {
    alias: {
      // Fix path resolution for relative imports
      '@app': path.resolve(__dirname, './src/app'),
      '@environments': path.resolve(__dirname, './src/environments'),
    },
  },
});
