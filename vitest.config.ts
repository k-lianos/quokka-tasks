import { defineConfig } from 'vitest/config';

// Pin a non-UTC timezone with DST so local-date logic is exercised for real.
// Test workers inherit this from the main process.
process.env.TZ = 'Europe/Athens';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/domain/**/*.test.ts', 'electron/**/*.test.ts'],
  },
});
