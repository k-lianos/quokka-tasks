export type Status = 'pending' | 'in_progress' | 'completed';

export const STATUSES: readonly Status[] = ['pending', 'in_progress', 'completed'];

export const STATUS_LABEL: Record<Status, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
};

export type Priority = 'high' | 'normal' | 'low';

export const PRIORITIES: readonly Priority[] = ['high', 'normal', 'low'];

export const PRIORITY_LABEL: Record<Priority, string> = {
    high: 'High',
    normal: 'Normal',
    low: 'Low',
};

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: Status;
    /** A note only: doesn't affect list order. */
    priority: Priority;
    /** Free text, e.g. '2h'; '' when not set. */
    estimate: string;
    /** A URL as typed; '' when not set. Not validated on save. */
    link: string;
    /** Due time on the ticket's date, 24-hour 'HH:MM'; null when not set. Always null in the backlog. */
    dueTime: string | null;
    /** Local calendar date 'YYYY-MM-DD'; null means the ticket is in the backlog. */
    date: string | null;
    /** 0-based index within its list (its day, or the backlog). 0 = highest priority. */
    position: number;
    createdAt: string;
    updatedAt: string;
}

export interface DataFile {
    version: 3;
    tickets: Ticket[];
}
