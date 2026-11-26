import { describe, expect, test } from 'vitest';
import {
  addDays,
  formatDayHeader,
  formatLongDate,
  formatWeekLabel,
  isoWeekNumber,
  nextViewedWeek,
  startOfWeek,
  toLocalDate,
  weekDates,
} from './dates';

describe('local dates', () => {
  test('toLocalDate uses the local calendar day, not UTC', () => {
    // 00:30 in Athens is still the previous day in UTC
    expect(toLocalDate(new Date(2026, 10, 26, 0, 30))).toBe('2026-11-26');
  });

  test('addDays crosses DST changes and year ends', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-23', -1)).toBe('2026-11-22');
  });
});

describe('weeks', () => {
  test('startOfWeek returns the Monday of the week', () => {
    expect(startOfWeek('2026-11-26')).toBe('2026-11-23');
    expect(startOfWeek('2026-11-29')).toBe('2026-11-23');
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
  });

  test('weekDates lists Monday to Sunday', () => {
    expect(weekDates('2026-11-23')).toEqual([
      '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29',
    ]);
  });

  test('isoWeekNumber follows ISO 8601', () => {
    expect(isoWeekNumber('2026-11-26')).toBe(48);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
  });
});

describe('labels', () => {
  test('formatWeekLabel handles same-month, cross-month and cross-year weeks', () => {
    expect(formatWeekLabel('2026-11-23')).toBe('Week 48 · 23–29 Nov 2026');
    expect(formatWeekLabel('2026-11-30')).toBe('Week 49 · 30 Nov – 6 Dec 2026');
    expect(formatWeekLabel('2026-12-28')).toBe('Week 53 · 28 Dec 2026 – 3 Jan 2027');
  });

  test('day header and long date', () => {
    expect(formatDayHeader('2026-11-23')).toBe('Mon 23');
    expect(formatLongDate('2026-11-26')).toBe('Thu 26 Nov 2026');
  });
});

describe('nextViewedWeek', () => {
  test('follows to the new week only when the old current week was being viewed', () => {
    expect(nextViewedWeek('2026-11-23', '2026-11-29', '2026-11-30')).toBe('2026-11-30');
    expect(nextViewedWeek('2026-11-09', '2026-11-29', '2026-11-30')).toBe('2026-11-09');
    expect(nextViewedWeek('2026-11-23', '2026-11-25', '2026-11-26')).toBe('2026-11-23');
  });
});
