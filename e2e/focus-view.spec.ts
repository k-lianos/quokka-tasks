import type { Page } from '@playwright/test';
import { formatDayHeader } from '../src/domain/dates';
import type { DataFile } from '../src/shared/types';
import { dataFile, day, drag, editor, expect, goTo, list, test, ticket, weekOf } from './app';

const now = (page: Page) => page.getByRole('region', { name: 'Now' });
const openT = (page: Page) => now(page).getByRole('button', { name: 'Open' }).click();
// Not exact: a label wrapping a <select> includes the selected option in its name ('Status Pending').
const field = (page: Page, label: string) => editor(page).getByLabel(label);
const dateField = (page: Page) => editor(page).getByLabel('Date', { exact: true });
const save = (page: Page) => editor(page).getByRole('button', { name: 'Save' }).click();
const findT = async (read: () => Promise<DataFile>) => (await read()).tickets.find(t => t.id === 't');
const NOTE = 'Past dates are only for completed tickets';

test.describe('a pending ticket today', () => {
    test.use({ seed: dataFile([ticket({ id: 't', title: 'Tango', date: day(0) })]) });

    test('a past date on a pending ticket snaps to today', async ({ quokka: { page, today } }) => {
        await openT(page);
        await dateField(page).fill(day(-3));
        await dateField(page).blur();
        await expect(dateField(page)).toHaveValue(today);
        await expect(editor(page).getByText(NOTE)).toBeVisible();
    });

    test('completed can move to a past day', async ({ quokka: { page, readData } }) => {
        const past = weekOf(-1)[2];
        await openT(page);
        await field(page, 'Status').selectOption({ label: 'Completed' });
        await dateField(page).fill(past);
        await dateField(page).blur();
        await save(page);
        await expect.poll(() => findT(readData)).toMatchObject({ date: past, status: 'completed' });
        await editor(page).getByRole('button', { name: 'Close' }).click();
        await goTo(page, `#/day/${past}`);
        await expect(list(page, 'Done')).toContainText('Tango');
    });

    test('switching back to pending snaps the past date', async ({ quokka: { page, today } }) => {
        await openT(page);
        await field(page, 'Status').selectOption({ label: 'Completed' });
        await dateField(page).fill(day(-3));
        await dateField(page).blur();
        await expect(dateField(page)).toHaveValue(day(-3));
        await field(page, 'Status').selectOption({ label: 'Pending' });
        await expect(dateField(page)).toHaveValue(today);
        await expect(editor(page).getByText(NOTE)).toBeVisible();
    });

    test('due time 0930 shows 09:30', async ({ quokka: { page, readData } }) => {
        await openT(page);
        await field(page, 'Due time').focus(); // a click can land on the minutes segment
        await field(page, 'Due time').pressSequentially('0930');
        await field(page, 'Due time').blur();
        await save(page);
        await expect.poll(() => findT(readData)).toMatchObject({ dueTime: '09:30' });
        await editor(page).getByRole('button', { name: 'Close' }).click();
        await expect(now(page)).toContainText('09:30');
        await openT(page);
        await expect(field(page, 'Due time')).toHaveValue('09:30');
        await editor(page).getByRole('button', { name: 'Close' }).click();
        await page.getByRole('button', { name: 'Week' }).click();
        await expect(list(page, formatDayHeader(day(0)))).toContainText('09:30');
    });

    test('created and updated show, and updated changes', async ({ quokka: { page, readData } }) => {
        await openT(page);
        await expect(editor(page).getByText(/^Created .+ · Updated .+$/)).toBeVisible();
        await field(page, 'Title').fill('Tango 2');
        await save(page);
        await expect.poll(async () => (await findT(readData))?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
    });
});

test.describe('a backlog ticket and a pending ticket today', () => {
    test.use({
        seed: dataFile([
            ticket({ id: 'b0', title: 'Backlog zero', date: null, position: 0 }),
            ticket({ id: 't', title: 'Tango', date: day(0) }),
        ]),
    });

    test('backlog checkbox moves it to the end of the backlog', async ({ quokka: { page, readData } }) => {
        await openT(page);
        await field(page, 'No date (backlog)').check();
        await save(page);
        await expect.poll(() => findT(readData)).toMatchObject({ date: null, position: 1 });
    });
});

test.describe('a timed ticket today', () => {
    test.use({ seed: dataFile([ticket({ id: 't', title: 'Tango', date: day(0), dueTime: '14:00' })]) });

    test('clearing the time removes it', async ({ quokka: { page, readData } }) => {
        await openT(page);
        await field(page, 'Due time').fill('');
        await field(page, 'Due time').blur();
        await save(page);
        await expect.poll(() => findT(readData)).toMatchObject({ dueTime: null });
        await editor(page).getByRole('button', { name: 'Close' }).click();
        await expect(page.getByText('14:00')).toHaveCount(0);
    });

    test('backlog clears the time', async ({ quokka: { page, readData } }) => {
        await openT(page);
        await field(page, 'No date (backlog)').check();
        await save(page);
        await expect.poll(() => findT(readData)).toMatchObject({ date: null, dueTime: null });
    });
});

test.describe('a timed ticket behind the Now ticket', () => {
    test.use({
        seed: dataFile([
            ticket({ id: 'n', title: 'November', date: day(0), position: 0, status: 'in_progress' }),
            ticket({ id: 't', title: 'Tango', date: day(0), position: 1, dueTime: '14:00' }),
        ]),
    });

    test('the Up next row shows the time', async ({ quokka: { page } }) => {
        await expect(list(page, 'Up next')).toContainText('14:00');
    });
});

test.describe('a timed ticket next week', () => {
    test.use({ seed: dataFile([ticket({ id: 't', title: 'Tango', date: weekOf(1)[2], dueTime: '14:00' })]) });

    test('dragging a timed ticket to the backlog drops its time', async ({ quokka: { page, readData } }) => {
        await goTo(page, `#/week/${weekOf(1)[0]}`);
        await drag(page, list(page, formatDayHeader(weekOf(1)[2])).getByRole('button', { name: /Tango/ }), list(page, 'Backlog'));
        await expect.poll(() => findT(readData)).toMatchObject({ date: null, dueTime: null });
    });
});
