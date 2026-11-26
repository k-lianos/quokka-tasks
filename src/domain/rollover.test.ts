import { expect, test } from 'vitest';
import { rollover } from './rollover';
import { makeTicket } from './testUtils';
import { listOf } from './tickets';

const T = '2026-11-26';
const NOW = '2026-11-26T08:00:00.000Z';

test('unfinished past tickets go to the top of today, oldest date first', () => {
  const r = rollover([
    makeTicket({ id: 'today1', date: T, position: 0 }),
    makeTicket({ id: 'tue1', date: '2026-11-24', position: 1, status: 'in_progress' }),
    makeTicket({ id: 'tue0', date: '2026-11-24', position: 0 }),
    makeTicket({ id: 'mon0', date: '2026-11-23', position: 0 }),
  ], T, NOW);
  expect(listOf(r, T).map((t) => [t.id, t.position])).toEqual([['mon0', 0], ['tue0', 1], ['tue1', 2], ['today1', 3]]);
  expect(r.find((t) => t.id === 'mon0')!.updatedAt).toBe(NOW);
});

test('completed past tickets stay on their day; remaining list is renumbered', () => {
  const r = rollover([
    makeTicket({ id: 'done', date: '2026-11-24', position: 1, status: 'completed' }),
    makeTicket({ id: 'open', date: '2026-11-24', position: 0 }),
  ], T, NOW);
  expect(listOf(r, '2026-11-24').map((t) => [t.id, t.position])).toEqual([['done', 0]]);
});

test('future and backlog tickets are untouched and nothing-to-do returns the same array', () => {
  const input = [makeTicket({ id: 'f', date: '2026-11-30' }), makeTicket({ id: 'b', date: null }), makeTicket({ id: 't', date: T })];
  expect(rollover(input, T, NOW)).toBe(input);
});
