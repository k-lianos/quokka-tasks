import { app, BrowserWindow } from 'electron';
import * as path from 'node:path';

const DEV_URL = 'http://localhost:4200';
const isDev = !app.isPackaged && process.argv.includes('--dev');

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 900,
    title: 'Quokka Tasks',
  });
  if (isDev) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadFile(path.join(app.getAppPath(), 'dist/renderer/browser/index.html'));
  }
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
