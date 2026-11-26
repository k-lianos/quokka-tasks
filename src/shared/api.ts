import type { DataFile } from './types';

export interface LoadResult {
  data: DataFile;
  /** Shown to the user once, e.g. when an unreadable data file was set aside. */
  notice: string | null;
}

export interface TasksApi {
  load(): Promise<LoadResult>;
  /** Rejects if the file could not be written. */
  save(data: DataFile): Promise<void>;
  /** The main process asks the UI to flush pending edits before the window closes. */
  onFlushRequest(handler: () => Promise<void>): void;
}

export const IPC = {
  load: 'tasks:load',
  save: 'tasks:save',
  flushRequest: 'app:flush-request',
  flushDone: 'app:flush-done',
} as const;

declare global {
  interface Window {
    api: TasksApi;
  }
}
