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
  /** Controls for the frameless window: the UI draws its own title bar buttons. */
  window: WindowApi;
}

export interface WindowApi {
  minimize(): void;
  toggleMaximize(): void;
  /** Goes through the normal close path, so pending edits are flushed first. */
  close(): void;
  isMaximized(): Promise<boolean>;
  /** Calls the handler whenever the window is maximised or restored; returns an unsubscribe function. */
  onMaximizedChange(handler: (maximized: boolean) => void): () => void;
}

export const IPC = {
  load: 'tasks:load',
  save: 'tasks:save',
  flushRequest: 'app:flush-request',
  flushDone: 'app:flush-done',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  windowMaximizedChange: 'window:maximized-change',
} as const;

declare global {
  interface Window {
    api: TasksApi;
  }
}
