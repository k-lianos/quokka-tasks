import { app, BrowserWindow, ipcMain, shell, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { IPC } from '../src/shared/api';
import type { DataFile } from '../src/shared/types';
import { openInBrowser } from './links';
import { createStore, type Store } from './storage';

const DEV_URL = 'http://localhost:4200';
const FLUSH_TIMEOUT_MS = 2000;
const isDev = !app.isPackaged && process.argv.includes('--dev');
const isMac = process.platform === 'darwin';
let quitting = false;

// Keep data in <appData>/quokka-tasks regardless of productName.
// An explicit --user-data-dir (used for isolated test runs) wins.
if (!app.commandLine.hasSwitch('user-data-dir')) {
    app.setPath('userData', path.join(app.getPath('appData'), 'quokka-tasks'));
}

let mainWindow: BrowserWindow | null = null;

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });
    app.whenReady().then(start);
}

function start(): void {
    const store = createStore(app.getPath('userData'));
    ipcMain.handle(IPC.load, () => store.load());
    ipcMain.handle(IPC.save, (_e, data: DataFile) => store.save(data));

    // Window controls for the frameless window (the UI draws its own title bar).
    const senderWindow = (e: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null => BrowserWindow.fromWebContents(e.sender);
    ipcMain.on(IPC.windowMinimize, e => senderWindow(e)?.minimize());
    ipcMain.on(IPC.windowToggleMaximize, e => {
        const win = senderWindow(e);
        if (!win) return;
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
    });
    ipcMain.on(IPC.windowClose, e => senderWindow(e)?.close()); // goes through handleCloseFlush
    ipcMain.handle(IPC.windowIsMaximized, e => senderWindow(e)?.isMaximized() ?? false);

    mainWindow = createWindow(store);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(store);
    });
}

function createWindow(store: Store): BrowserWindow {
    const win = new BrowserWindow({
        width: 1400,
        height: 800,
        minWidth: 900,
        title: 'Quokka Tasks',
        // The UI draws its own title bar (AppHeader). On Linux/Windows the window is frameless and the UI
        // also draws the window buttons (WindowControls); macOS keeps its native traffic lights instead.
        ...(isMac ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 18, y: 24 } } : { frame: false }),
        icon: path.join(app.getAppPath(), 'dist/renderer/browser/icon.png'),
        backgroundColor: '#070b12', // matches --color-bg in src/styles.css, so no white flash on launch
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    const indexFile = path.join(app.getAppPath(), 'dist/renderer/browser/index.html');
    const ownUrl = isDev ? DEV_URL : pathToFileURL(indexFile).href;

    // Lock-down: no new app windows and no navigation away from the app. An http(s) link opened from
    // the UI (target="_blank") goes to the system browser; anything else is dropped.
    win.webContents.setWindowOpenHandler(({ url }) => {
        openInBrowser(url, u => shell.openExternal(u));
        return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(ownUrl)) event.preventDefault();
    });

    handleCloseFlush(win, store);
    win.on('maximize', () => win.webContents.send(IPC.windowMaximizedChange, true));
    win.on('unmaximize', () => win.webContents.send(IPC.windowMaximizedChange, false));

    if (isDev) void win.loadURL(DEV_URL);
    else void win.loadFile(indexFile);
    return win;
}

/**
 * Before closing, let the UI save pending edits and wait until every queued save
 * has reached the disk (the whole sequence is bounded by a timeout).
 */
function handleCloseFlush(win: BrowserWindow, store: Store): void {
    let flushed = false;
    let flushing = false;

    win.on('close', event => {
        if (flushed) return;
        event.preventDefault();
        if (flushing) return;
        flushing = true;

        const finish = (): void => {
            if (flushed) return;
            flushed = true;
            clearTimeout(timer);
            ipcMain.removeListener(IPC.flushDone, onDone);
            win.close();
        };
        const onDone = (e: IpcMainEvent): void => {
            if (e.sender === win.webContents) void store.whenIdle().then(finish);
        };
        const timer = setTimeout(finish, FLUSH_TIMEOUT_MS);
        ipcMain.on(IPC.flushDone, onDone);
        win.webContents.send(IPC.flushRequest);
    });

    win.on('closed', () => {
        if (mainWindow === win) mainWindow = null;
    });
}

// Cmd+Q closes the window through handleCloseFlush, which cancels that first close, so the quit
// itself gets cancelled. Remember it and quit once the window has gone.
app.on('before-quit', () => {
    quitting = true;
});

app.on('window-all-closed', () => {
    if (!isMac || quitting) app.quit();
});
