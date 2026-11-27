import { expect, test } from 'vitest';
import type { Status } from '../shared/types';
import { dayProgress, nowTicket, upNextToIndex } from './day';
import { makeTicket } from './testUtils';
import { moveTicket } from './tickets';

const D = '2026-11-26';
const mk = (id: string, position: number, status: Status) => makeTicket({ id, date: D, position, status });

test('nowTicket prefers the highest-priority In Progress ticket', () => {
    const t = [mk('a', 0, 'pending'), mk('b', 1, 'pending'), mk('c', 2, 'in_progress'), mk('d', 3, 'in_progress')];
    expect(nowTicket(t, D)?.id).toBe('c');
});

test('nowTicket falls back to the top Pending ticket, then null', () => {
    expect(nowTicket([mk('a', 0, 'pending'), mk('b', 1, 'pending')], D)?.id).toBe('a');
    expect(nowTicket([mk('a', 0, 'completed')], D)).toBeNull();
    expect(nowTicket([], D)).toBeNull();
});

test('nowTicket re-picks when Now is deleted or set back to Pending', () => {
    const t = [mk('a', 0, 'pending'), mk('b', 1, 'in_progress'), mk('c', 2, 'in_progress')];
    expect(
        nowTicket(
            t.filter(x => x.id !== 'b'),
            D,
        )?.id,
    ).toBe('c');
    expect(
        nowTicket(
            t.map(x => (x.id === 'b' ? { ...x, status: 'pending' as const } : x)),
            D,
        )?.id,
    ).toBe('c');
});

test('nowTicket ignores other days', () => {
    expect(nowTicket([makeTicket({ id: 'x', date: '2026-11-27', status: 'in_progress' })], D)).toBeNull();
});

test('dayProgress counts completed of all', () => {
    expect(dayProgress([mk('a', 0, 'pending'), mk('b', 1, 'completed'), mk('c', 2, 'completed')], D)).toEqual({ done: 2, total: 3 });
    expect(dayProgress([], D)).toEqual({ done: 0, total: 0 });
});

// others = the day's open ids without the dragged one; Now = 'n'
test('upNextToIndex: gap above a visible ticket goes directly before it', () => {
    expect(upNextToIndex(['a', 'n', 'b'], 'n', 0)).toBe(0);
    expect(upNextToIndex(['a', 'n', 'b'], 'n', 1)).toBe(2); // between a and b → after Now
});

test('upNextToIndex: end of Up next goes after Now', () => {
    expect(upNextToIndex(['a', 'n'], 'n', 1)).toBe(2);
    expect(upNextToIndex(['n'], 'n', 0)).toBe(1);
    expect(upNextToIndex([], null, 0)).toBe(0);
});

test('upNextToIndex without Now is the identity', () => {
    expect(upNextToIndex(['a', 'b', 'c'], null, 2)).toBe(2);
    expect(upNextToIndex(['a', 'b', 'c'], null, 3)).toBe(3);
});

test('a pure reorder below a Pending Now keeps Now', () => {
    // Now 'a' is the top Pending; drag 'c' (Pending) to the top of Up next
    const t = [mk('a', 0, 'pending'), mk('b', 1, 'pending'), mk('c', 2, 'pending')];
    const to = upNextToIndex(['a', 'b'], 'a', 0);
    expect(nowTicket(moveTicket(t, 'c', D, to, 'now'), D)?.id).toBe('a');
});
