import { expect, test } from 'vitest';
import { canDropInto } from './drop';

const T = '2026-11-26';

test('the backlog, today and future days accept drops', () => {
  expect(canDropInto(null, T)).toBe(true);
  expect(canDropInto(T, T)).toBe(true);
  expect(canDropInto('2026-11-30', T)).toBe(true);
});

test('past days refuse drops', () => {
  expect(canDropInto('2026-11-25', T)).toBe(false);
});
