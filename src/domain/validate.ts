import { STATUSES, type DataFile, type Ticket } from '../shared/types';
import { renumberAll } from './tickets';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyDataFile(): DataFile {
    return { version: 1, tickets: [] };
}

function isTicket(v: unknown): v is Ticket {
    if (typeof v !== 'object' || v === null) return false;
    const t = v as Record<string, unknown>;
    return (
        typeof t['id'] === 'string' &&
        typeof t['title'] === 'string' &&
        t['title'].trim() !== '' &&
        typeof t['description'] === 'string' &&
        (STATUSES as readonly unknown[]).includes(t['status']) &&
        (t['date'] === null || (typeof t['date'] === 'string' && DATE.test(t['date']))) &&
        typeof t['position'] === 'number' &&
        Number.isFinite(t['position']) &&
        typeof t['createdAt'] === 'string' &&
        typeof t['updatedAt'] === 'string'
    );
}

/** Returns null for anything that isn't a valid version-1 data file. Positions are repaired. */
export function parseDataFile(text: string): DataFile | null {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return null;
    }
    if (typeof raw !== 'object' || raw === null) return null;
    const file = raw as Record<string, unknown>;
    if (file['version'] !== 1 || !Array.isArray(file['tickets'])) return null;
    const tickets: unknown[] = file['tickets'];
    if (!tickets.every(isTicket)) return null;
    if (new Set(tickets.map(t => t.id)).size !== tickets.length) return null;
    return { version: 1, tickets: renumberAll(tickets) };
}
