# Quokka Tasks

A personal, offline desktop tasks app: a Monday–Sunday week view plus a backlog of tickets
(title, description, status). Drag tickets to plan and prioritise them. Unfinished tickets from
past days move to today automatically. Completed tickets stay on their day, sink to the bottom,
and are locked until you change their status.

Built with Electron and Angular. No internet connection is needed or used.

## Run it

```bash
npm install
npm start          # builds everything and opens the app
```

For development with live reload, use two terminals:

```bash
npm run serve      # Angular dev server on http://localhost:4200
npm run dev        # Electron window pointed at the dev server
```

Don't open `http://localhost:4200` in a normal browser: the UI needs the Electron window to
read and save its data.

### Why dev runs use `--no-sandbox`

`npm start` and `npm run dev` launch Electron with `--no-sandbox`. On Ubuntu 24.04 and later,
AppArmor blocks Chromium's sandbox for the Electron binary in `node_modules`, and Electron
aborts with `FATAL:setuid_sandbox_host.cc ... chrome-sandbox is owned by root and has mode 4755`
([electron#42510](https://github.com/electron/electron/issues/42510)). Dev runs load only this
app's own code, and the window blocks navigation and new windows, so the risk is small.
`contextIsolation` and `nodeIntegration: false` still apply.

The installed `.deb` (`npm run make`) is **not** affected and runs with the full sandbox.
Test the installed package before a release, because it is the only build that runs sandboxed.

To keep the sandbox in development too, make the helper root-owned and setuid. Redo this after
every `npm install` that reinstalls Electron:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
npx electron .
```

## Test and package

```bash
npm test           # unit tests (Vitest)
npm run build      # build UI + main process (also the type check)
npm run make       # .deb and .zip in out/make/ (on a Mac or Windows: that platform's .zip)
```

Install the package with `sudo apt install ./out/make/deb/x64/quokka-tasks_*_amd64.deb`.

## Install on Windows

Download `Quokka.Tasks-win32-x64-<version>.zip` from the
[releases](https://github.com/k-lianos/quokka-tasks/releases), unzip it anywhere (for example
`%LOCALAPPDATA%\Programs\Quokka Tasks`) and run `quokka-tasks.exe`. Pin it to the taskbar or
Start to keep it handy. There is no installer: to remove it, delete the folder.

The app isn't code-signed, so on first launch SmartScreen shows "Windows protected your PC".
Click **More info**, then **Run anyway**.

## Install on macOS

Download `Quokka.Tasks-darwin-arm64-<version>.zip` (Apple Silicon) or
`Quokka.Tasks-darwin-x64-<version>.zip` (Intel) from the
[releases](https://github.com/k-lianos/quokka-tasks/releases), unzip it and move
`Quokka Tasks.app` to Applications.

The app isn't signed with an Apple Developer ID, so on first launch macOS refuses to open it
("damaged" or "Apple could not verify"). Allow it once, either way:

- Open it, then go to System Settings → Privacy & Security and click **Open Anyway**.
- Or clear the download quarantine: `xattr -dr com.apple.quarantine "/Applications/Quokka Tasks.app"`.

## CI and releases

GitHub Actions runs `format:check`, the tests and the build on every pull request and on
pushes to `main` (`.github/workflows/ci.yml`). `main` requires that check to pass. The tests
and the build also run on Windows and macOS.

Releases are git tags that publish the Linux `.deb` and `.zip`, the macOS `.zip` files and
the Windows `.zip` as a GitHub Release. See
[`docs/releasing.md`](docs/releasing.md), or run `/release` in Claude Code.

## Your data

All tickets are in one file:

- Ubuntu: `~/.config/quokka-tasks/tasks.json`
- Windows: `%APPDATA%\quokka-tasks\tasks.json`
- macOS: `~/Library/Application Support/quokka-tasks/tasks.json`

Back it up by copying that file. If the file is ever unreadable, the app keeps it as
`tasks.corrupt-<time>.json` next to it and starts empty. It never overwrites it.

When a new version of the app changes the file's format, it upgrades the file on first
launch and first keeps the original as `tasks.v<old version>.backup.json` (e.g.
`tasks.v2.backup.json`). Older versions of the app can't read an upgraded file; to go back,
restore that backup as `tasks.json`.

## Design

See `docs/superpowers/specs/2026-11-26-tasks-app-design.md`.
