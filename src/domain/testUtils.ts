import type { Ticket } from '../shared/types';

export function makeTicket(p: Partial<Ticket> & { id: string }): Ticket {
    return {
        title: p.id,
        description: '',
        status: 'pending',
        date: null,
        position: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...p,
    };
}
