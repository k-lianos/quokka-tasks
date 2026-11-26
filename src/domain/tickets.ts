import type { Ticket } from '../shared/types';

// Pure list operations. A "list" is one calendar date or the backlog (date === null).
// Positions within a list are contiguous from 0 (0 = highest priority).
// Within a list, open tickets come before completed ones; completed tickets can't be moved.
// Functions never mutate their input and return the same array when nothing changes.

type Patch = Partial<Pick<Ticket, 'title' | 'description' | 'status'>>;

export function listOf(tickets: Ticket[], date: string | null): Ticket[] {
  return tickets.filter((t) => t.date === date).sort((p, q) => p.position - q.position);
}

/** Give each ticket in `orderedIds` (all in list `date`) its index as position. */
function placeList(tickets: Ticket[], date: string | null, orderedIds: string[], touched: Set<string>, now: string): Ticket[] {
  const index = new Map(orderedIds.map((id, i) => [id, i]));
  let changed = false;
  const next = tickets.map((t) => {
    const position = index.get(t.id);
    if (position === undefined) return t;
    if (t.position === position && t.date === date) return t;
    changed = true;
    return { ...t, date, position, ...(touched.has(t.id) ? { updatedAt: now } : {}) };
  });
  return changed ? next : tickets;
}

export function createTicket(
  tickets: Ticket[],
  args: { id: string; title: string; date: string | null; now: string },
): Ticket[] {
  const title = args.title.trim();
  if (!title) return tickets;
  const ticket: Ticket = {
    id: args.id,
    title,
    description: '',
    status: 'pending',
    date: args.date,
    position: listOf(tickets, args.date).length,
    createdAt: args.now,
    updatedAt: args.now,
  };
  return [...tickets, ticket];
}

export function updateTicket(tickets: Ticket[], id: string, patch: Patch, now: string): Ticket[] {
  const current = tickets.find((t) => t.id === id);
  if (!current) return tickets;
  const next: Ticket = { ...current };
  if (patch.title !== undefined && patch.title.trim()) next.title = patch.title.trim();
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.status !== undefined) next.status = patch.status;
  if (next.title === current.title && next.description === current.description && next.status === current.status) {
    return tickets;
  }
  next.updatedAt = now;
  return tickets.map((t) => (t.id === id ? next : t));
}

export function deleteTicket(tickets: Ticket[], id: string): Ticket[] {
  const victim = tickets.find((t) => t.id === id);
  if (!victim) return tickets;
  const rest = tickets.filter((t) => t.id !== id);
  const remaining = listOf(rest, victim.date).map((t) => t.id);
  return placeList(rest, victim.date, remaining, new Set(), '');
}

export function moveTicket(tickets: Ticket[], id: string, toDate: string | null, toIndex: number, now: string): Ticket[] {
  const moving = tickets.find((t) => t.id === id);
  if (!moving || moving.status === 'completed') return tickets;
  const others = listOf(tickets, toDate).filter((t) => t.id !== id);
  const target = others.map((t) => t.id);
  const openCount = others.filter((t) => t.status !== 'completed').length;
  const at = Math.max(0, Math.min(toIndex, openCount));
  target.splice(at, 0, id);

  let next = tickets;
  if (moving.date !== toDate) {
    const source = listOf(tickets, moving.date).filter((t) => t.id !== id).map((t) => t.id);
    next = placeList(next, moving.date, source, new Set(), now);
  }
  return placeList(next, toDate, target, new Set([id]), now);
}

/** Order every list open-first, completed after, each group keeping its order. Stable, so a ticket
 *  that just became completed lands at the top of the pile and a reopened one becomes the last open. */
export function sinkCompleted(tickets: Ticket[]): Ticket[] {
  const lists = new Map<string | null, Ticket[]>();
  for (const t of tickets) {
    const list = lists.get(t.date);
    if (list) list.push(t);
    else lists.set(t.date, [t]);
  }
  const position = new Map<string, number>();
  for (const list of lists.values()) {
    list
      .sort((p, q) => Number(p.status === 'completed') - Number(q.status === 'completed') || p.position - q.position)
      .forEach((t, i) => position.set(t.id, i));
  }
  if (tickets.every((t) => t.position === position.get(t.id))) return tickets;
  return tickets.map((t) => (t.position === position.get(t.id) ? t : { ...t, position: position.get(t.id)! }));
}

export function renumberAll(tickets: Ticket[]): Ticket[] {
  const lists = new Map<string | null, Ticket[]>();
  for (const t of tickets) lists.set(t.date, [...(lists.get(t.date) ?? []), t]);
  let next = tickets;
  for (const [date, list] of lists) {
    const ordered = [...list].sort(
      (p, q) => p.position - q.position || p.createdAt.localeCompare(q.createdAt) || p.id.localeCompare(q.id),
    );
    next = placeList(next, date, ordered.map((t) => t.id), new Set(), '');
  }
  return next;
}
