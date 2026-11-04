import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    // jsdom setup is most of the run time; this builds it once per worker.
    // Files share globals as a result, so tests must clean up after
    // themselves.
    isolate: false,
    maxWorkers: 2,
  },
});
