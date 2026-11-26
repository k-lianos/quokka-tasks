import type { Ticket } from '../shared/types';
import { listOf } from './tickets';

// Rules for the Day view. "Now" is derived from status and priority, never stored.

/** The ticket to work on: the highest-priority In Progress ticket, else the highest-priority Pending one. */
export function nowTicket(tickets: Ticket[], date: string): Ticket | null {
  const day = listOf(tickets, date);
  return day.find((t) => t.status === 'in_progress') ?? day.find((t) => t.status === 'pending') ?? null;
}

export function dayProgress(tickets: Ticket[], date: string): { done: number; total: number } {
  const day = tickets.filter((t) => t.date === date);
  return { done: day.filter((t) => t.status === 'completed').length, total: day.length };
}

/**
 * Up next shows the day's open tickets minus Now, so its drop index is not a position in the day.
 * `otherOpenIds`: the day's open ticket ids in priority order, without the dragged ticket (Now included).
 * Returns moveTicket's toIndex: directly before the visible ticket below the gap, or, at the end of
 * Up next, after every open ticket (so a drop never lands just above a hidden Now).
 */
export function upNextToIndex(otherOpenIds: string[], nowId: string | null, dropIndex: number): number {
  const visible = otherOpenIds.filter((id) => id !== nowId);
  return dropIndex < visible.length ? otherOpenIds.indexOf(visible[dropIndex]) : otherOpenIds.length;
}
