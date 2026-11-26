/** Tickets can be dropped into the backlog (null), today, or a future day — never into the past. */
export function canDropInto(date: string | null, today: string): boolean {
  return date === null || date >= today;
}
