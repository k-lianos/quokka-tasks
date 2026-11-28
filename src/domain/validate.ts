import { PRIORITIES, STATUSES, type DataFile, type Ticket } from '../shared/types';
import { migrate } from './migrate';
import { renumberAll } from './tickets';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A due time: 24-hour 'HH:MM'. */
export const DUE_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyDataFile(): DataFile {
    return { version: 3, tickets: [] };
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
        (PRIORITIES as readonly unknown[]).includes(t['priority']) &&
        typeof t['estimate'] === 'string' &&
        typeof t['link'] === 'string' &&
        // A time on a backlog ticket isn't rejected here: the domain drops it, and the file still loads.
        (t['dueTime'] === null || (typeof t['dueTime'] === 'string' && DUE_TIME.test(t['dueTime']))) &&
        (t['date'] === null || (typeof t['date'] === 'string' && DATE.test(t['date']))) &&
        typeof t['position'] === 'number' &&
        Number.isFinite(t['position']) &&
        typeof t['createdAt'] === 'string' &&
        typeof t['updatedAt'] === 'string'
    );
}

/**
 * Parse a data file of any known version: migrate it to the current version, then validate it.
 * Returns null for anything unreadable, invalid or from a newer app. Positions are repaired.
 * `fromVersion` is the version found on disk, so the caller knows whether a migration happened.
 */
export function parseDataFile(text: string): { data: DataFile; fromVersion: number } | null {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return null;
    }
    const migrated = migrate(raw);
    if (!migrated) return null;
    const file = migrated.file as Record<string, unknown>;
    if (!Array.isArray(file['tickets'])) return null;
    const tickets: unknown[] = file['tickets'];
    if (!tickets.every(isTicket)) return null;
    if (new Set(tickets.map(t => t.id)).size !== tickets.length) return null;
    return { data: { version: 3, tickets: renumberAll(tickets) }, fromVersion: migrated.fromVersion };
}
