import { addDays, isValidDate, nextViewedWeek, startOfWeek, weekDates } from './dates';

/** What the main area shows: one day, or one week (identified by its Monday). */
export type View = { kind: 'day'; date: string } | { kind: 'week'; weekStart: string };

export function viewUrl(v: View): string {
  return v.kind === 'day' ? `/day/${v.date}` : `/week/${v.weekStart}`;
}

/** Reads a router URL such as '/day/2026-11-26'. Null for anything else or an invalid date. */
export function parseViewUrl(url: string): View | null {
  const m = /^\/(day|week)\/([^/?#]+)(?:[?#].*)?$/.exec(url);
  if (!m || !isValidDate(m[2])) return null;
  return m[1] === 'day' ? { kind: 'day', date: m[2] } : { kind: 'week', weekStart: m[2] };
}

export function stepView(v: View, delta: 1 | -1): View {
  return v.kind === 'day'
    ? { kind: 'day', date: addDays(v.date, delta) }
    : { kind: 'week', weekStart: addDays(v.weekStart, 7 * delta) };
}

export function todayView(kind: View['kind'], today: string): View {
  return kind === 'day' ? { kind: 'day', date: today } : { kind: 'week', weekStart: startOfWeek(today) };
}

/** Day → the week containing it; week → today if it's in that week, otherwise the week's Monday. */
export function switchView(v: View, today: string): View {
  if (v.kind === 'day') return { kind: 'week', weekStart: startOfWeek(v.date) };
  return { kind: 'day', date: weekDates(v.weekStart).includes(today) ? today : v.weekStart };
}

/** After the local date changes, follow to the new today only if the user was looking at the old one. */
export function followToday(v: View, oldToday: string, newToday: string): View {
  if (v.kind === 'day') return v.date === oldToday ? { kind: 'day', date: newToday } : v;
  const weekStart = nextViewedWeek(v.weekStart, oldToday, newToday);
  return weekStart === v.weekStart ? v : { kind: 'week', weekStart };
}
