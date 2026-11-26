// Local calendar dates as 'YYYY-MM-DD' strings. Never derived via toISOString(),
// which would shift the day for anyone east or west of UTC.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number): string => String(n).padStart(2, '0');

function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

export function formatWeekLabel(weekStart: string): string {
  const start = parse(weekStart);
  const end = parse(addDays(weekStart, 6));
  const week = `Week ${isoWeekNumber(weekStart)}`;
  const endText = `${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  let range: string;
  if (start.getFullYear() !== end.getFullYear()) {
    range = `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${endText}`;
  } else if (start.getMonth() !== end.getMonth()) {
    range = `${start.getDate()} ${MONTHS[start.getMonth()]} – ${endText}`;
  } else {
    range = `${start.getDate()}–${endText}`;
  }
  return `${week} · ${range}`;
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
