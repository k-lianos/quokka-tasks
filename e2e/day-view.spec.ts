import { dataFile, day, editor, expect, goTo, list, test, ticket } from './app';

const now = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Now' });

test.describe('with an in-progress ticket', () => {
    test.use({
        seed: dataFile([
            ticket({ id: 'a', title: 'Alpha', date: day(0), position: 0 }),
            ticket({ id: 'b', title: 'Bravo', date: day(0), position: 1 }),
            ticket({ id: 'c', title: 'Charlie', date: day(0), position: 2, status: 'in_progress' }),
        ]),
    });

    test('Now is the in-progress ticket', async ({ quokka: { page } }) => {
        await expect(now(page)).toContainText('Charlie');
        const upNext = list(page, 'Up next');
        await expect(upNext).toContainText('Alpha');
        await expect(upNext).toContainText('Bravo');
        await expect(upNext).not.toContainText('Charlie');
        await expect(upNext.getByRole('button', { name: 'Start' })).toHaveCount(2);
    });

    test('deleting the Now ticket re-picks Now', async ({ quokka: { page } }) => {
        await now(page).getByRole('button', { name: 'Open' }).click();
        await editor(page).getByRole('button', { name: 'Delete' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
        await expect(now(page)).toContainText('Alpha');
    });
});

test.describe('with pending and completed tickets', () => {
    test.use({
        seed: dataFile([
            ticket({ id: 'a', title: 'Alpha', date: day(0), position: 0 }),
            ticket({ id: 'b', title: 'Bravo', date: day(0), position: 1 }),
            ticket({ id: 'd', title: 'Delta', date: day(0), position: 2, status: 'completed' }),
            ticket({ id: 'p', title: 'Past done', date: day(-1), position: 0, status: 'completed' }),
        ]),
    });

    test('Now is the first open ticket when none is in progress', async ({ quokka: { page } }) => {
        await expect(now(page)).toContainText('Alpha');
    });

    test('completed tickets show under Done', async ({ quokka: { page } }) => {
        await expect(list(page, 'Done')).toContainText('Delta');
        await expect(list(page, 'Up next')).not.toContainText('Delta');
    });

    test('a past day is read-only', async ({ quokka: { page } }) => {
        await goTo(page, `#/day/${day(-1)}`);
        await expect(list(page, 'Done')).toContainText('Past done');
        await expect(list(page, 'Up next')).toHaveCount(0);
        await expect(list(page, 'Planned')).toHaveCount(0);
        await expect(page.getByRole('main').getByRole('region', { name: 'Done' }).getByRole('button', { name: '+ add' })).toHaveCount(0);
        await expect(page.getByRole('button', { name: '+ add' })).toHaveCount(1); // the backlog's only
    });
});

test('a future day shows Planned', async ({ quokka: { page } }) => {
    await goTo(page, `#/day/${day(1)}`);
    await expect(list(page, 'Planned')).toBeVisible();
    await expect(list(page, 'Up next')).toHaveCount(0);
});
