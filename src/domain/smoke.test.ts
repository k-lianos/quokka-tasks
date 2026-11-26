import { expect, test } from 'vitest';

test('tests run in the pinned Europe/Athens timezone', () => {
  expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(-120);
});
