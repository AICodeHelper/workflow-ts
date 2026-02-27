import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: true,
    environment: 'happy-dom',
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./test/setup.ts'],
  },
});
