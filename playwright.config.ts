import { defineConfig } from '@playwright/test';

// Pin the same non-UTC timezone as the unit tests and the launched app, so the tests and the app
// agree on today. Workers inherit this from the main process.
process.env['TZ'] = 'Europe/Athens';

const ci = !!process.env['CI'];

export default defineConfig({
    testDir: 'e2e',
    fullyParallel: true,
    workers: ci ? 1 : undefined,
    retries: 0, // a flaky test must fail, not be retried until it passes
    forbidOnly: ci,
    timeout: 30_000,
    reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: { trace: 'retain-on-failure' },
});
