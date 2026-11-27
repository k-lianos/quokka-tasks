import { expect, test } from 'vitest';
import { makeTicket } from './testUtils';
import { rollover } from './rollover';
import { createTicket, deleteTicket, listOf, moveTicket, renumberAll, sinkCompleted, updateTicket } from './tickets';

const a = makeTicket({ id: 'a', date: '2026-11-26', position: 0 });
const b = makeTicket({ id: 'b', date: '2026-11-26', position: 1 });
const c = makeTicket({ id: 'c', date: '2026-11-26', position: 2 });
const x = makeTicket({ id: 'x', date: null, position: 0 });
const all = [a, b, c, x];
const NOW = '2026-11-26T10:00:00.000Z';
const ids = (list: { id: string }[]) => list.map(t => t.id);

test('createTicket appends a pending ticket at the bottom', () => {
    const r = createTicket(all, { id: 'n', title: '  New  ', date: '2026-11-26', now: NOW });
    expect(ids(listOf(r, '2026-11-26'))).toEqual(['a', 'b', 'c', 'n']);
    expect(r.find(t => t.id === 'n')).toMatchObject({
        title: 'New',
        status: 'pending',
        description: '',
        position: 3,
        createdAt: NOW,
        updatedAt: NOW,
    });
});

test('createTicket rejects whitespace-only titles', () => {
    expect(createTicket(all, { id: 'n', title: '   ', date: null, now: NOW })).toBe(all);
});

test('updateTicket ignores an empty title but applies other fields', () => {
    const r = updateTicket(all, 'a', { title: '  ', description: 'd' }, NOW);
    expect(r.find(t => t.id === 'a')).toMatchObject({ title: 'a', description: 'd', updatedAt: NOW });
});

test('updateTicket trims the title and returns the same array when nothing changes', () => {
    expect(updateTicket(all, 'a', { title: ' A ' }, NOW).find(t => t.id === 'a')!.title).toBe('A');
    expect(updateTicket(all, 'a', { title: 'a' }, NOW)).toBe(all);
    expect(updateTicket(all, 'missing', { title: 'z' }, NOW)).toBe(all);
});

test('deleteTicket renumbers the list', () => {
    expect(listOf(deleteTicket(all, 'a'), '2026-11-26').map(t => [t.id, t.position])).toEqual([
        ['b', 0],
        ['c', 1],
    ]);
});

test('moveTicket reorders within a list', () => {
    expect(ids(listOf(moveTicket(all, 'c', '2026-11-26', 0, NOW), '2026-11-26'))).toEqual(['c', 'a', 'b']);
});

test('moveTicket moves between lists and renumbers both', () => {
    const r = moveTicket(all, 'b', null, 0, NOW);
    expect(listOf(r, null).map(t => [t.id, t.position])).toEqual([
        ['b', 0],
        ['x', 1],
    ]);
    expect(listOf(r, '2026-11-26').map(t => [t.id, t.position])).toEqual([
        ['a', 0],
        ['c', 1],
    ]);
    expect(r.find(t => t.id === 'b')).toMatchObject({ date: null, updatedAt: NOW });
});

test('moveTicket clamps the index and is a no-op when nothing changes', () => {
    expect(ids(listOf(moveTicket(all, 'a', '2026-11-26', 99, NOW), '2026-11-26'))).toEqual(['b', 'c', 'a']);
    expect(moveTicket(all, 'b', '2026-11-26', 1, NOW)).toBe(all);
});

test('renumberAll closes gaps and breaks ties by createdAt', () => {
    const r = renumberAll([
        makeTicket({ id: 'p', position: 5 }),
        makeTicket({ id: 'q', position: 5, createdAt: '2025-01-01T00:00:00.000Z' }),
    ]);
    expect(listOf(r, null).map(t => [t.id, t.position])).toEqual([
        ['q', 0],
        ['p', 1],
    ]);
});

// Completed tickets: locked in place, piled at the bottom of their list.
const D = '2026-11-26';
const done = (id: string, position: number) => makeTicket({ id, date: D, position, status: 'completed' });
const open = (id: string, position: number) => makeTicket({ id, date: D, position });

test('sinkCompleted moves completed tickets below open ones, keeping each group in order', () => {
    const r = sinkCompleted([done('d1', 0), open('o1', 1), done('d2', 2), open('o2', 3)]);
    expect(listOf(r, D).map(t => [t.id, t.position])).toEqual([
        ['o1', 0],
        ['o2', 1],
        ['d1', 2],
        ['d2', 3],
    ]);
});

test('sinkCompleted returns the same array when already ordered (idempotent)', () => {
    const ordered = [open('o1', 0), done('d1', 1)];
    expect(sinkCompleted(ordered)).toBe(ordered);
    const once = sinkCompleted([done('d1', 0), open('o1', 1)]);
    expect(sinkCompleted(once)).toBe(once);
});

test('a ticket marked completed goes to the top of the pile', () => {
    const list = [open('o1', 0), open('o2', 1), done('d1', 2)];
    const r = sinkCompleted(updateTicket(list, 'o1', { status: 'completed' }, NOW));
    expect(ids(listOf(r, D))).toEqual(['o2', 'o1', 'd1']);
});

test('a ticket set back from completed becomes the last open ticket', () => {
    const list = [open('o1', 0), done('d1', 1), done('d2', 2)];
    const r = sinkCompleted(updateTicket(list, 'd2', { status: 'pending' }, NOW));
    expect(ids(listOf(r, D))).toEqual(['o1', 'd2', 'd1']);
});

test('a new ticket in a day with completed tickets lands above the pile', () => {
    const r = sinkCompleted(createTicket([open('o1', 0), done('d1', 1)], { id: 'n', title: 'N', date: D, now: NOW }));
    expect(ids(listOf(r, D))).toEqual(['o1', 'n', 'd1']);
});

test('moveTicket refuses to move a completed ticket', () => {
    const list = [open('o1', 0), done('d1', 1)];
    expect(moveTicket(list, 'd1', null, 0, NOW)).toBe(list);
    expect(moveTicket(list, 'd1', D, 0, NOW)).toBe(list);
});

test('moveTicket clamps a drop below the pile to just above it', () => {
    const list = [open('o1', 0), done('d1', 1), done('d2', 2), makeTicket({ id: 'x', date: null, position: 0 })];
    expect(ids(listOf(moveTicket(list, 'x', D, 3, NOW), D))).toEqual(['o1', 'x', 'd1', 'd2']);
    expect(ids(listOf(moveTicket(list, 'o1', D, 2, NOW), D))).toEqual(['o1', 'd1', 'd2']);
});

test('moveTicket into an all-completed list lands at the top', () => {
    const list = [done('d1', 0), makeTicket({ id: 'x', date: null, position: 0 })];
    expect(ids(listOf(moveTicket(list, 'x', D, 1, NOW), D))).toEqual(['x', 'd1']);
});

test('rollover into a day with completed tickets keeps the pile at the bottom', () => {
    const list = [done('d1', 0), makeTicket({ id: 'late', date: '2026-11-25', position: 0 })];
    const r = sinkCompleted(rollover(list, D, NOW));
    expect(ids(listOf(r, D))).toEqual(['late', 'd1']);
});

test('sinkCompleted leaves its input untouched and renumbers duplicate or gapped positions', () => {
    const input = [done('d1', 0), open('o1', 0), open('o2', 5), makeTicket({ id: 'x', date: null, position: 3 })];
    const snapshot = structuredClone(input);
    const r = sinkCompleted(input);
    expect(input).toEqual(snapshot);
    expect(listOf(r, D).map(t => [t.id, t.position])).toEqual([
        ['o1', 0],
        ['o2', 1],
        ['d1', 2],
    ]);
    expect(listOf(r, null).map(t => [t.id, t.position])).toEqual([['x', 0]]);
    expect(r.every((t, i) => t.updatedAt === input[i].updatedAt)).toBe(true);
});
