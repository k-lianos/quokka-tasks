import { contextBridge, ipcRenderer } from 'electron';
import type { IPC as SharedIPC, TasksApi } from '../src/shared/api';
import type { DataFile } from '../src/shared/types';

// A sandboxed preload can only require('electron'), so the channel names are
// repeated here; `satisfies` makes the compiler prove they match src/shared/api.ts.
const IPC = {
  load: 'tasks:load',
  save: 'tasks:save',
  flushRequest: 'app:flush-request',
  flushDone: 'app:flush-done',
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
};

contextBridge.exposeInMainWorld('api', api);
