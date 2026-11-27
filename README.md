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
npm run make       # .deb and .zip in out/make/
```

Install the package with `sudo apt install ./out/make/deb/x64/quokka-tasks_*_amd64.deb`.

## CI and releases

GitHub Actions runs `format:check`, the tests and the build on every pull request and on
pushes to `main` (`.github/workflows/ci.yml`). `main` requires that check to pass.

Releases are git tags that publish the `.deb` and `.zip` as a GitHub Release. See
[`docs/releasing.md`](docs/releasing.md), or run `/release` in Claude Code.

## Your data

All tickets are in one file:

- Ubuntu: `~/.config/quokka-tasks/tasks.json`
- Windows: `%APPDATA%\quokka-tasks\tasks.json`
- macOS: `~/Library/Application Support/quokka-tasks/tasks.json`

Back it up by copying that file. If the file is ever unreadable, the app keeps it as
`tasks.corrupt-<time>.json` next to it and starts empty. It never overwrites it.

## Design

See `docs/superpowers/specs/2026-11-26-tasks-app-design.md`.
