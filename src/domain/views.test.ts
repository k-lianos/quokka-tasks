import { expect, test } from 'vitest';
import { followToday, parseViewUrl, stepView, switchView, todayView, viewUrl, type View } from './views';

const day = (date: string): View => ({ kind: 'day', date });
const week = (weekStart: string): View => ({ kind: 'week', weekStart });

test('viewUrl / parseViewUrl round trip', () => {
  expect(viewUrl(day('2026-11-26'))).toBe('/day/2026-11-26');
  expect(viewUrl(week('2026-11-23'))).toBe('/week/2026-11-23');
  expect(parseViewUrl('/week/2026-11-23')).toEqual(week('2026-11-23'));
  expect(parseViewUrl('/day/2026-11-26?x=1')).toEqual(day('2026-11-26'));
  expect(parseViewUrl('/day/2026-02-30')).toBeNull();
  expect(parseViewUrl('/')).toBeNull();
  expect(parseViewUrl('/other/2026-11-26')).toBeNull();
});

test('stepView moves a day or a week', () => {
  expect(stepView(day('2026-11-30'), -1)).toEqual(day('2026-11-29'));
  expect(stepView(week('2026-11-23'), 1)).toEqual(week('2026-11-30'));
});

test('todayView', () => {
  expect(todayView('day', '2026-11-26')).toEqual(day('2026-11-26'));
  expect(todayView('week', '2026-11-26')).toEqual(week('2026-11-23'));
});

test('switchView', () => {
  expect(switchView(day('2026-11-29'), '2026-11-26')).toEqual(week('2026-11-23'));
  expect(switchView(week('2026-11-23'), '2026-11-26')).toEqual(day('2026-11-26'));
  expect(switchView(week('2026-11-30'), '2026-11-26')).toEqual(day('2026-11-30'));
});

test('followToday follows only from the old today', () => {
  const v = day('2026-11-26');
  expect(followToday(v, '2026-11-26', '2026-11-27')).toEqual(day('2026-11-27'));
  const other = day('2026-11-20');
  expect(followToday(other, '2026-11-26', '2026-11-27')).toBe(other);
  expect(followToday(week('2026-11-23'), '2026-11-29', '2026-11-30')).toEqual(week('2026-11-30'));
  const otherWeek = week('2026-11-09');
  expect(followToday(otherWeek, '2026-11-29', '2026-11-30')).toBe(otherWeek);
});
