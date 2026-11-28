import { formatDayHeader } from '../src/domain/dates';
import { day, expect, goTo, list, test, weekOf } from './app';

const url = (hash: string) => new RegExp(`${hash.replace(/[/]/g, '\\/')}$`);

test('an impossible date goes to today', async ({ quokka: { page, today } }) => {
    await goTo(page, '#/day/2026-02-30');
    await expect(page).toHaveURL(url(`#/day/${today}`));
});

test('a garbage date goes to today', async ({ quokka: { page, today } }) => {
    await goTo(page, '#/day/garbage');
    await expect(page).toHaveURL(url(`#/day/${today}`));
});

test('a mid-week URL snaps to its Monday', async ({ quokka: { page } }) => {
    await goTo(page, `#/week/${weekOf(0)[3]}`);
    await expect(page).toHaveURL(url(`#/week/${weekOf(0)[0]}`));
});

test('reload keeps the week', async ({ quokka: { page } }) => {
    const monday = weekOf(1)[0];
    await goTo(page, `#/week/${monday}`);
    await expect(list(page, formatDayHeader(monday))).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(url(`#/week/${monday}`));
    await expect(list(page, formatDayHeader(monday))).toBeVisible();
});

test('next, previous and Today in day view', async ({ quokka: { page, today } }) => {
    await page.getByRole('button', { name: 'Next day' }).click();
    await expect(page).toHaveURL(url(`#/day/${day(1)}`));
    await page.getByRole('button', { name: 'Previous day' }).click();
    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page).toHaveURL(url(`#/day/${day(-1)}`));
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page).toHaveURL(url(`#/day/${today}`));
});

test('next, previous and Today in week view', async ({ quokka: { page } }) => {
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page).toHaveURL(url(`#/week/${weekOf(0)[0]}`));
    await page.getByRole('button', { name: 'Next week' }).click();
    await expect(page).toHaveURL(url(`#/week/${weekOf(1)[0]}`));
    await page.getByRole('button', { name: 'Previous week' }).click();
    await page.getByRole('button', { name: 'Previous week' }).click();
    await expect(page).toHaveURL(url(`#/week/${weekOf(-1)[0]}`));
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page).toHaveURL(url(`#/week/${weekOf(0)[0]}`));
});

test('a day heading opens that day', async ({ quokka: { page } }) => {
    const date = weekOf(0)[2];
    await page.getByRole('button', { name: 'Week' }).click();
    await list(page, formatDayHeader(date))
        .getByRole('link', { name: formatDayHeader(date) })
        .click();
    await expect(page).toHaveURL(url(`#/day/${date}`));
});

test('the backlog is a named list', async ({ quokka: { page } }) => {
    await expect(list(page, 'Backlog')).toBeVisible();
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(list(page, 'Backlog')).toBeVisible();
});
