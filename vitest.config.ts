import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // Empties the page after every test.
    setupFiles: ['tests/setup.ts'],
    // jsdom setup is most of the run time; this builds it once per worker.
    // Files share globals as a result: tests/setup.ts cleans the page, the
    // rest is up to each test.
    isolate: false,
    maxWorkers: 2,
  },
});
