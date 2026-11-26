export type Status = 'pending' | 'in_progress' | 'completed';

export const STATUSES: readonly Status[] = ['pending', 'in_progress', 'completed'];

export const STATUS_LABEL: Record<Status, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: Status;
  /** Local calendar date 'YYYY-MM-DD'; null means the ticket is in the backlog. */
  date: string | null;
  /** 0-based index within its list (its day, or the backlog). 0 = highest priority. */
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DataFile {
  version: 1;
  tickets: Ticket[];
}
