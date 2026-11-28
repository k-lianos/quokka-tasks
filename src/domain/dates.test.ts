import { describe, expect, test } from 'vitest';
import {
    addDays,
    formatDayHeader,
    formatDayHeading,
    formatLongDate,
    formatTimestamp,
    formatWeekHeading,
    isValidDate,
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
            '2026-11-23',
            '2026-11-24',
            '2026-11-25',
            '2026-11-26',
            '2026-11-27',
            '2026-11-28',
            '2026-11-29',
        ]);
    });

    test('isoWeekNumber follows ISO 8601', () => {
        expect(isoWeekNumber('2026-11-26')).toBe(48);
        expect(isoWeekNumber('2026-01-01')).toBe(1);
        expect(isoWeekNumber('2027-01-01')).toBe(53);
    });
});

describe('labels', () => {
    test('formatWeekHeading splits week number/year from the date range', () => {
        expect(formatWeekHeading('2026-11-23')).toEqual({ eyebrow: 'Week 48 · 2026', range: '23 – 29 November' });
        expect(formatWeekHeading('2026-11-30')).toEqual({ eyebrow: 'Week 49 · 2026', range: '30 November – 6 December' });
        expect(formatWeekHeading('2026-12-28')).toEqual({ eyebrow: 'Week 53 · 2026', range: '28 December 2026 – 3 January 2027' });
        // ISO week 1 of 2026 starts in December 2025: the eyebrow uses the ISO-week year.
        expect(formatWeekHeading('2025-12-29')).toEqual({ eyebrow: 'Week 1 · 2026', range: '29 December 2025 – 4 January 2026' });
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

describe('day view dates', () => {
    test('isValidDate accepts real dates only', () => {
        expect(isValidDate('2026-11-26')).toBe(true);
        expect(isValidDate('2028-02-29')).toBe(true);
        expect(isValidDate('2026-02-30')).toBe(false);
        expect(isValidDate('2026-1-5')).toBe(false);
        expect(isValidDate('garbage')).toBe(false);
    });

    test('formatDayHeading', () => {
        expect(formatDayHeading('2026-11-26', '2026-11-26')).toEqual({ eyebrow: 'Thursday · Week 48', title: '26 November' });
        expect(formatDayHeading('2027-01-04', '2026-11-26')).toEqual({ eyebrow: 'Monday · Week 1', title: '4 January 2027' });
    });
});

test('formatTimestamp shows an ISO timestamp as a local long date', () => {
    expect(formatTimestamp('2026-11-26T12:00:00.000Z')).toBe('Thu 26 Nov 2026');
});
