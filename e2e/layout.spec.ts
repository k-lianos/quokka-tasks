import { formatDayHeader } from '../src/domain/dates';
import { dataFile, expect, goTo, list, test, ticket, weekOf } from './app';

const longTitle = 'A very long ticket title that keeps going well past the width of any week column at all '.padEnd(120, 'x');
const date = weekOf(1)[2];

test.use({ seed: dataFile([ticket({ id: 'l', title: longTitle, date, dueTime: '14:00' })]) });

test.beforeEach(async ({ quokka: { app, page } }) => {
    // Re-apply until it sticks: the window manager may still resize a window that has just opened.
    await expect
        .poll(async () => {
            await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(900, 700));
            return page.evaluate(() => window.innerWidth);
        })
        .toBe(900);
    await goTo(page, `#/week/${weekOf(1)[0]}`);
});

const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('long titles are ellipsized', async ({ quokka: { page } }) => {
    const title = list(page, formatDayHeader(date)).getByTitle(longTitle);
    expect(await title.evaluate(e => e.scrollWidth > e.clientWidth && getComputedStyle(e).textOverflow === 'ellipsis')).toBe(true);
});

test("the time doesn't overlap the title", async ({ quokka: { page } }) => {
    const column = list(page, formatDayHeader(date));
    const title = (await column.getByTitle(longTitle).boundingBox())!;
    const time = (await column.getByText('14:00').boundingBox())!;
    expect(overlap(title, time)).toBe(false);
    const nav = (await page.getByRole('group', { name: 'week navigation' }).boundingBox())!;
    const heading = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    expect(overlap(nav, heading)).toBe(false);
});
