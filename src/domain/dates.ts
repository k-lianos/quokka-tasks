// Local calendar dates as 'YYYY-MM-DD' strings. Never derived via toISOString(),
// which would shift the day for anyone east or west of UTC.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS =['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number): string => String(n).padStart(2, '0');

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True for a real calendar date written as 'YYYY-MM-DD' (e.g. rejects '2026-02-30'). */
export function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;
}

export function todayLocal(): string {
  return toLocalDate(new Date());
}

export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + n);
  return toLocalDate(d);
}

export function startOfWeek(date: string): string {
  const daysSinceMonday = (parse(date).getDay() + 6) % 7;
  return addDays(date, -daysSinceMonday);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function isoWeekNumber(date: string): number {
  // The ISO week belongs to the year of its Thursday; week 1 contains 4 January.
  const thursday = parse(addDays(startOfWeek(date), 3));
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  const dayOfYear = Math.round((thursday.getTime() - jan1.getTime()) / 86_400_000);
  return Math.floor(dayOfYear / 7) + 1;
}

export interface WeekHeading {
  /** e.g. 'Week 48 · 2026' — the year is the ISO-week year (year of its Thursday). */
  eyebrow: string;
  /** e.g. '23 – 29 November', '30 November – 6 December', '28 December 2026 – 3 January 2027'. */
  range: string;
}

export function formatWeekHeading(weekStart: string): WeekHeading {
  const start = parse(weekStart);
  const end = parse(addDays(weekStart, 6));
  const isoYear = parse(addDays(weekStart, 3)).getFullYear();
  const day = (d: Date): string => `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
  let range: string;
  if (start.getFullYear() !== end.getFullYear()) {
    range = `${day(start)} ${start.getFullYear()} – ${day(end)} ${end.getFullYear()}`;
  } else if (start.getMonth() !== end.getMonth()) {
    range = `${day(start)} – ${day(end)}`;
  } else {
    range = `${start.getDate()} – ${day(end)}`;
  }
  return { eyebrow: `Week ${isoWeekNumber(weekStart)} · ${isoYear}`, range };
}

export function formatDayHeader(date: string): string {
  const d = parse(date);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}`;
}

export function formatLongDate(date: string): string {
  const d = parse(date);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** After the local date changes, keep following "this week" only if the user was looking at it. */
export function nextViewedWeek(viewedWeekStart: string, oldToday: string, newToday: string): string {
  return viewedWeekStart === startOfWeek(oldToday) ? startOfWeek(newToday) : viewedWeekStart;
}

export interface DayHeading {
  /** e.g. 'Thursday · Week 48'. */
  eyebrow: string;
  /** e.g. '26 November'; the year is added when it isn't today's year. */
  title: string;
}

export function formatDayHeading(date: string, today: string): DayHeading {
  const d = parse(date);
  const year = d.getFullYear() === parse(today).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return {
    eyebrow: `${WEEKDAYS_LONG[d.getDay()]} · Week ${isoWeekNumber(date)}`,
    title: `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}${year}`,
  };
}
