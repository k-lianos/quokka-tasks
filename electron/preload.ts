import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { IPC as SharedIPC, TasksApi } from '../src/shared/api';
import type { DataFile } from '../src/shared/types';

// A sandboxed preload can only require('electron'), so the channel names are
// repeated here; `satisfies` makes the compiler prove they match src/shared/api.ts.
const IPC = {
  load: 'tasks:load',
  save: 'tasks:save',
  flushRequest: 'app:flush-request',
  flushDone: 'app:flush-done',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  windowMaximizedChange: 'window:maximized-change',
} as const satisfies typeof SharedIPC;

const api: TasksApi = {
  load: () => ipcRenderer.invoke(IPC.load),
  save: (data: DataFile) => ipcRenderer.invoke(IPC.save, data),
  onFlushRequest(handler) {
    ipcRenderer.on(IPC.flushRequest, async () => {
      try {
        await handler();
      } catch (e) {
        console.error('Flush before close failed', e);
      }
      ipcRenderer.send(IPC.flushDone);
    });
  },
  window: {
    minimize: () => ipcRenderer.send(IPC.windowMinimize),
    toggleMaximize: () => ipcRenderer.send(IPC.windowToggleMaximize),
    close: () => ipcRenderer.send(IPC.windowClose),
    isMaximized: () => ipcRenderer.invoke(IPC.windowIsMaximized),
    onMaximizedChange(handler) {
      const listener = (_e: IpcRendererEvent, maximized: boolean): void => handler(maximized);
      ipcRenderer.on(IPC.windowMaximizedChange, listener);
      return () => ipcRenderer.removeListener(IPC.windowMaximizedChange, listener);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
