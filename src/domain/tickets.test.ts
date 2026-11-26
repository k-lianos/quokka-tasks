import { expect, test } from 'vitest';
import { makeTicket } from './testUtils';
import { createTicket, deleteTicket, listOf, moveTicket, renumberAll, updateTicket } from './tickets';

const a = makeTicket({ id: 'a', date: '2026-11-26', position: 0 });
const b = makeTicket({ id: 'b', date: '2026-11-26', position: 1 });
const c = makeTicket({ id: 'c', date: '2026-11-26', position: 2 });
const x = makeTicket({ id: 'x', date: null, position: 0 });
const all = [a, b, c, x];
const NOW = '2026-11-26T10:00:00.000Z';
const ids = (list: { id: string }[]) => list.map((t) => t.id);

test('createTicket appends a pending ticket at the bottom', () => {
  const r = createTicket(all, { id: 'n', title: '  New  ', date: '2026-11-26', now: NOW });
  expect(ids(listOf(r, '2026-11-26'))).toEqual(['a', 'b', 'c', 'n']);
  expect(r.find((t) => t.id === 'n')).toMatchObject({
    title: 'New', status: 'pending', description: '', position: 3, createdAt: NOW, updatedAt: NOW,
  });
});

test('createTicket rejects whitespace-only titles', () => {
  expect(createTicket(all, { id: 'n', title: '   ', date: null, now: NOW })).toBe(all);
});

test('updateTicket ignores an empty title but applies other fields', () => {
  const r = updateTicket(all, 'a', { title: '  ', description: 'd' }, NOW);
  expect(r.find((t) => t.id === 'a')).toMatchObject({ title: 'a', description: 'd', updatedAt: NOW });
});

test('updateTicket trims the title and returns the same array when nothing changes', () => {
  expect(updateTicket(all, 'a', { title: ' A ' }, NOW).find((t) => t.id === 'a')!.title).toBe('A');
  expect(updateTicket(all, 'a', { title: 'a' }, NOW)).toBe(all);
  expect(updateTicket(all, 'missing', { title: 'z' }, NOW)).toBe(all);
});

test('deleteTicket renumbers the list', () => {
  expect(listOf(deleteTicket(all, 'a'), '2026-11-26').map((t) => [t.id, t.position])).toEqual([['b', 0], ['c', 1]]);
});

test('moveTicket reorders within a list', () => {
  expect(ids(listOf(moveTicket(all, 'c', '2026-11-26', 0, NOW), '2026-11-26'))).toEqual(['c', 'a', 'b']);
});

test('moveTicket moves between lists and renumbers both', () => {
  const r = moveTicket(all, 'b', null, 0, NOW);
  expect(listOf(r, null).map((t) => [t.id, t.position])).toEqual([['b', 0], ['x', 1]]);
  expect(listOf(r, '2026-11-26').map((t) => [t.id, t.position])).toEqual([['a', 0], ['c', 1]]);
  expect(r.find((t) => t.id === 'b')).toMatchObject({ date: null, updatedAt: NOW });
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
  expect(listOf(r, null).map((t) => [t.id, t.position])).toEqual([['q', 0], ['p', 1]]);
});
