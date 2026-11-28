import { dataFile, day, expect, launch, closeApp, test, ticket } from './app';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

test("opens on today's day view", async ({ quokka: { page, today } }) => {
    await expect(page).toHaveURL(new RegExp(`#/day/${today}$`));
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
});

test('uses the scratch data dir', async ({ quokka: { app, dir } }) => {
    expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(dir);
});

test.describe('seeded', () => {
    test.use({ seed: dataFile([ticket({ id: 'a', title: 'Seeded ticket', date: day(0) })]) });

    test('shows seeded data', async ({ quokka: { page } }) => {
        await expect(page.getByText('Seeded ticket').first()).toBeVisible();
    });
});

test('teardown leaves no process', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quokka-e2e-'));
    try {
        const { app } = await launch(dir);
        const pid = app.process().pid!;
        await closeApp(app);
        expect(() => process.kill(pid, 0)).toThrow(/ESRCH/);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});
