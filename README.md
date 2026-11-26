# Quokka Tasks

A personal, offline desktop tasks app: a Monday–Sunday week view plus a backlog of tickets
(title, description, status). Drag tickets to plan and prioritise them. Unfinished tickets from
past days move to today automatically.

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

## Test and package

```bash
npm test           # unit tests (Vitest)
npm run build      # build UI + main process (also the type check)
npm run make       # .deb and .zip in out/make/
```

Install the package with `sudo apt install ./out/make/deb/x64/quokka-tasks_*_amd64.deb`.

## Your data

All tickets are in one file:

- Ubuntu: `~/.config/quokka-tasks/tasks.json`
- Windows: `%APPDATA%\quokka-tasks\tasks.json`
- macOS: `~/Library/Application Support/quokka-tasks/tasks.json`

Back it up by copying that file. If the file is ever unreadable, the app keeps it as
`tasks.corrupt-<time>.json` next to it and starts empty. It never overwrites it.

## Design

See `docs/superpowers/specs/2026-11-26-tasks-app-design.md`.
