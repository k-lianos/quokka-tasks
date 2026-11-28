import { readFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { DataFile } from '../src/shared/types';
import { closeApp, dataFile, day, editor, expect, list, test, ticket } from './app';

const v2Text = readFileSync(path.join(__dirname, '../src/domain/fixtures/tasks.v2.json'), 'utf8');
const find = async (read: () => Promise<DataFile>, id: string) => (await read()).tickets.find(t => t.id === id);

test.describe('an overdue ticket', () => {
    test.use({
        seed: dataFile([
            ticket({ id: 'o', title: 'Overdue', date: day(-2), position: 0 }),
            ticket({ id: 'd', title: 'Done before', date: day(-2), position: 1, status: 'completed' }),
            ticket({ id: 'a', title: 'Alpha', date: day(0), position: 0 }),
        ]),
    });

    test('an overdue open ticket rolls to the top of today', async ({ quokka: { readData, today } }) => {
        await expect.poll(() => find(readData, 'o')).toMatchObject({ date: today, position: 0 });
        await expect.poll(() => find(readData, 'a')).toMatchObject({ date: today, position: 1 });
    });

    test('a completed past ticket stays put', async ({ quokka: { readData, today } }) => {
        // Wait for the rollover save itself, so the check below reads the file that save wrote.
        await expect.poll(() => find(readData, 'o')).toMatchObject({ date: today });
        expect(await find(readData, 'd')).toMatchObject({ date: day(-2) });
    });
});

test.describe('a version 2 file', () => {
    test.use({ seed: v2Text });

    test('migrates with a backup', async ({ quokka: { dir, files, readData } }) => {
        await expect.poll(async () => (await readData()).version).toBe(3);
        expect(await files()).toContain('tasks.v2.backup.json');
        expect(await fs.readFile(path.join(dir, 'tasks.v2.backup.json'), 'utf8')).toBe(v2Text);
        const tickets = (await readData()).tickets;
        expect(tickets.length).toBe((JSON.parse(v2Text) as DataFile).tickets.length);
        for (const t of tickets) expect(t.dueTime).toBeNull();
    });
});

test.describe('a corrupt file', () => {
    test.use({ seed: '{oops' });

    test('is kept and the app starts empty', async ({ quokka: { page, dir, files } }) => {
        const banner = page.getByText(
            /^Your data file couldn't be read\. It was kept as tasks\.corrupt-.+\.json and the app started empty\.$/,
        );
        await expect(banner).toBeVisible();
        const corrupt = (await files()).filter(f => /^tasks\.corrupt-.+\.json$/.test(f));
        expect(corrupt).toHaveLength(1);
        expect(await fs.readFile(path.join(dir, corrupt[0]), 'utf8')).toBe('{oops');
        await page.getByRole('button', { name: 'Dismiss' }).click();
        await expect(banner).toBeHidden();
    });
});

test.describe('a backlog ticket', () => {
    test.use({ seed: dataFile([ticket({ id: 'b', title: 'Bravo', date: null })]) });

    test('an edit saved right before closing is on disk', async ({ quokka: { app, page, readData } }) => {
        await list(page, 'Backlog').getByRole('button', { name: /Bravo/ }).click();
        await editor(page).getByLabel('Title').fill('Bravo saved');
        await editor(page).getByRole('button', { name: 'Save' }).click();
        await closeApp(app);
        expect(await find(readData, 'b')).toMatchObject({ title: 'Bravo saved' });
    });
});

test.describe('an open ticket today, just before midnight', () => {
    test.use({ seed: dataFile([ticket({ id: 'm', title: 'Mike', date: day(0) })]) });

    test('rollover past midnight while open', async ({ quokka: { app, page, readData, today } }) => {
        await app.context().clock.install({ time: new Date(`${today}T23:59:30`) });
        await page.reload();
        await expect(page.getByRole('region', { name: 'Now' })).toContainText('Mike');
        await page.clock.runFor('01:00');
        await expect(page).toHaveURL(new RegExp(`#/day/${day(1)}$`));
        await expect.poll(() => find(readData, 'm')).toMatchObject({ date: day(1) });
    });
});
