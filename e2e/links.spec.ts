import { dataFile, editor, expect, list, test, ticket } from './app';

test.use({ seed: dataFile([ticket({ id: 'l', title: 'Lima', date: null })]) });

test.beforeEach(async ({ quokka: { app, page } }) => {
    await app.evaluate(({ shell }) => {
        const opened: string[] = [];
        (globalThis as { opened?: string[] }).opened = opened;
        shell.openExternal = async (url: string) => {
            opened.push(url);
        };
    });
    await list(page, 'Backlog').getByRole('button', { name: /Lima/ }).click();
});

test('Open shows only for http(s)', async ({ quokka: { page } }) => {
    const link = editor(page).getByLabel('Link', { exact: true });
    const open = editor(page).getByRole('link', { name: 'Open' });
    await link.fill('notaurl');
    await expect(open).toHaveCount(0);
    await link.fill('ftp://x');
    await expect(open).toHaveCount(0);
    await link.fill('https://example.com/a');
    await expect(open).toBeVisible();
});

test('Open uses the draft and goes to the system browser', async ({ quokka: { app, page } }) => {
    await editor(page).getByLabel('Link', { exact: true }).fill('https://example.com/a');
    await editor(page).getByRole('link', { name: 'Open' }).click();
    await expect.poll(() => app.evaluate(() => (globalThis as { opened?: string[] }).opened)).toEqual(['https://example.com/a']);
    expect(app.windows()).toHaveLength(1);
});
