import type { Ticket } from '../shared/types';
import { renumberAll } from './tickets';

/**
 * Enforce the invariant: no Pending / In Progress ticket has a date before today.
 * Overdue tickets move to the top of today, oldest date first, then by their old position.
 * Returns the same array when nothing is overdue.
 */
export function rollover(tickets: Ticket[], today: string, now: string): Ticket[] {
  const overdue = tickets
    .filter((t) => t.status !== 'completed' && t.date !== null && t.date < today)
    .sort((p, q) => p.date!.localeCompare(q.date!) || p.position - q.position);
  if (overdue.length === 0) return tickets;

  // Negative positions sort ahead of today's existing tickets; renumberAll then
  // makes every affected list contiguous again.
  const placed = new Map(overdue.map((t, i) => [t.id, i - overdue.length]));
  const moved = tickets.map((t) => {
    const position = placed.get(t.id);
    return position === undefined ? t : { ...t, date: today, position, updatedAt: now };
  });
  return renumberAll(moved);
}
