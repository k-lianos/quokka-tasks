import { addTicket, dataFile, editor, expect, list, test, ticket } from './app';

const seeded = ticket({
    id: 's',
    title: 'Seeded',
    description: 'First line',
    estimate: '1h',
    link: 'https://example.com',
    date: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
});
const byId = <T extends { id: string }>(tickets: T[], id: string) => tickets.find(t => t.id === id);

test('add to today and to the backlog', async ({ quokka: { page, today, readData } }) => {
    await addTicket(list(page, 'Up next'), 'Write tests');
    await addTicket(list(page, 'Backlog'), 'Someday');
    await expect
        .poll(async () => (await readData()).tickets.map(t => [t.title, t.date]).sort())
        .toEqual([
            ['Someday', null],
            ['Write tests', today],
        ]);
});

test.describe('with a seeded ticket', () => {
    test.use({ seed: dataFile([seeded]) });

    test('edit and save', async ({ quokka: { page, readData } }) => {
        await list(page, 'Backlog')
            .getByRole('button', { name: /Seeded/ })
            .click();
        const dialog = editor(page);
        await dialog.getByLabel('Title').fill('Renamed');
        await dialog.getByLabel('Status').selectOption({ label: 'In Progress' });
        await dialog.getByLabel('Priority').selectOption({ label: 'High' });
        await dialog.getByLabel('Estimate').fill('2h');
        await dialog.getByRole('button', { name: 'Save' }).click();
        await expect
            .poll(async () => byId((await readData()).tickets, 's'))
            .toMatchObject({ title: 'Renamed', status: 'in_progress', priority: 'high', estimate: '2h' });
        expect(byId((await readData()).tickets, 's')!.updatedAt).not.toBe(seeded.updatedAt);
    });

    test('close without saving discards every field', async ({ quokka: { page, readData } }) => {
        const open = () =>
            list(page, 'Backlog')
                .getByRole('button', { name: /Seeded/ })
                .click();
        await open();
        const dialog = editor(page);
        await dialog.getByLabel('Title').fill('Changed');
        await dialog.getByLabel('Priority').selectOption({ label: 'Low' });
        await dialog.getByLabel('Estimate').fill('9h');
        await dialog.getByLabel('Link').fill('https://changed.example');
        await dialog.getByLabel('Description').fill('Changed text');
        await dialog.getByRole('button', { name: 'Close' }).click();
        await expect(dialog).toBeHidden();
        await open();
        await expect(dialog.getByLabel('Title')).toHaveValue('Seeded');
        await expect(dialog.getByLabel('Priority')).toHaveValue('normal');
        await expect(dialog.getByLabel('Estimate')).toHaveValue('1h');
        await expect(dialog.getByLabel('Link')).toHaveValue('https://example.com');
        await expect(dialog.getByLabel('Description')).toHaveValue('First line');
        expect(byId((await readData()).tickets, 's')).toEqual(seeded);
    });

    test('save is disabled while the title is empty', async ({ quokka: { page } }) => {
        await list(page, 'Backlog')
            .getByRole('button', { name: /Seeded/ })
            .click();
        const dialog = editor(page);
        await dialog.getByLabel('Title').fill('');
        await expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
        await expect(dialog.getByText('Title is required')).toBeVisible();
    });

    test('delete asks first', async ({ quokka: { page, readData } }) => {
        await list(page, 'Backlog')
            .getByRole('button', { name: /Seeded/ })
            .click();
        const dialog = editor(page);
        const confirm = page.getByRole('alertdialog');
        await dialog.getByRole('button', { name: 'Delete' }).click();
        await expect(confirm).toContainText("Delete this ticket? This can't be undone.");
        await confirm.getByRole('button', { name: 'Cancel' }).click();
        await expect(confirm).toBeHidden();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Delete' }).click();
        await confirm.getByRole('button', { name: 'Delete' }).click();
        await expect(dialog).toBeHidden();
        await expect(list(page, 'Backlog').getByRole('button', { name: /Seeded/ })).toHaveCount(0);
        await expect.poll(async () => (await readData()).tickets).toEqual([]);
    });
});
