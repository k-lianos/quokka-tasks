import { formatDayHeader } from '../src/domain/dates';
import { dataFile, drag, editor, expect, goTo, list, test, ticket, weekOf } from './app';

const column = (page: import('@playwright/test').Page, date: string) => list(page, formatDayHeader(date));
const card = (where: import('@playwright/test').Locator, title: string) => where.getByRole('button', { name: new RegExp(title) });
const find = async (read: () => Promise<{ tickets: { id: string }[] }>, id: string) => (await read()).tickets.find(t => t.id === id);

const next = weekOf(1);
const prev = weekOf(-1);

test.use({
    seed: dataFile([
        ticket({ id: 'x', title: 'Xray', date: null, position: 0 }),
        ticket({ id: 'p', title: 'Papa', date: next[1], position: 0 }),
        ticket({ id: 'q', title: 'Quebec', date: next[1], position: 1 }),
        ticket({ id: 'd', title: 'Delta', date: next[1], position: 2, status: 'completed' }),
    ]),
});

test('backlog to a week column and back', async ({ quokka: { page, readData } }) => {
    await goTo(page, `#/week/${next[0]}`);
    await drag(page, card(list(page, 'Backlog'), 'Xray'), column(page, next[2]));
    await expect.poll(() => find(readData, 'x')).toMatchObject({ date: next[2] });
    await drag(page, card(column(page, next[2]), 'Xray'), list(page, 'Backlog'));
    await expect.poll(() => find(readData, 'x')).toMatchObject({ date: null });
});

test('drop lands at the drop position', async ({ quokka: { page, readData } }) => {
    await goTo(page, `#/week/${next[0]}`);
    await drag(page, card(list(page, 'Backlog'), 'Xray'), card(column(page, next[1]), 'Quebec'));
    await expect
        .poll(async () =>
            (await readData()).tickets
                .filter(t => t.date === next[1])
                .sort((a, b) => a.position - b.position)
                .map(t => t.id),
        )
        .toEqual(['p', 'x', 'q', 'd']);
});

test("a completed card can't be dragged but opens", async ({ quokka: { page, readData } }) => {
    await goTo(page, `#/week/${next[0]}`);
    await drag(page, card(column(page, next[1]), 'Delta'), list(page, 'Backlog'));
    await expect(card(column(page, next[1]), 'Delta')).toBeVisible();
    expect(await find(readData, 'd')).toMatchObject({ date: next[1] });
    await card(column(page, next[1]), 'Delta').click();
    await expect(editor(page)).toBeVisible();
});

test('a drop onto a past day is refused', async ({ quokka: { page, readData } }) => {
    await goTo(page, `#/week/${prev[0]}`);
    await drag(page, card(list(page, 'Backlog'), 'Xray'), column(page, prev[2]));
    await expect(card(list(page, 'Backlog'), 'Xray')).toBeVisible();
    expect(await find(readData, 'x')).toMatchObject({ date: null });
});
