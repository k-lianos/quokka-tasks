# Architecture

Quokka Tasks is an offline Electron desktop app. It has two processes. The Electron main process owns the window and the data file. The Angular UI runs in a sandboxed renderer and talks to the main process only through a small preload API. All business rules live in plain TypeScript that both sides share and that is unit-tested on its own.

For what the app does and why, see the design spec: `docs/superpowers/specs/2026-11-26-tasks-app-design.md`. For the UI's look, see `docs/style-guide.md`.

## Layers

```
src/domain/   business rules (pure functions, unit-tested)      ─┐
src/shared/   types and the IPC contract                        ─┤ imported by both
                                                                 │
electron/     main process + preload (Node, Electron)  ◄────────┤
src/app/      Angular UI (renderer)                    ◄────────┘
```

| Folder        | Contains                                                       | May import                          |
| ------------- | -------------------------------------------------------------- | ----------------------------------- |
| `src/domain/` | Ticket, date, view and rollover rules, data-file validation    | `src/shared/` only                  |
| `src/shared/` | `types.ts` (data model), `api.ts` (IPC channels, `window.api`) | nothing                             |
| `electron/`   | `main.ts`, `preload.ts`, `storage.ts`                          | Node built-ins, Electron, the above |
| `src/app/`    | Angular components and services                                | Angular, `@angular/cdk`, the above  |

`src/domain/` and `src/shared/` import nothing from Angular, Electron, Node or the DOM. Both builds compile them: `tsconfig.electron.json` includes them next to `electron/`, and the Angular build pulls them in through `src/app/`. Keep every rule that can be a pure function here, with a `*.test.ts` beside it.

## Data model

`src/shared/types.ts` defines it. Everything is one `DataFile`, `{ version: 1, tickets: Ticket[] }`. A `Ticket` has:

- `status`: `pending`, `in_progress` or `completed`.
- `date`: a local calendar date `YYYY-MM-DD`, or `null` for the backlog.
- `position`: its 0-based index within its list (its day, or the backlog). 0 is the highest priority.

Two rules hold after every change:

- **Rollover** (`domain/rollover.ts`): no open ticket has a date before today. Overdue tickets move to the top of today.
- **Completed sink** (`sinkCompleted` in `domain/tickets.ts`): in every list, open tickets come first and completed ones after.

### Versioning and migrations

`tasks.json` is plain JSON on the user's disk, and it outlives every app version. A user can skip any number of releases and install the latest, so every release must read every data file any earlier release wrote, with no data loss. The `version` field is how the app tells the shapes apart.

Today only version 1 exists, so there are no migrations yet. `parseDataFile` accepts only `version: 1`. Anything else, including a file from a newer app, is treated as corrupt: it is kept as `tasks.corrupt-<timestamp>.json` and the app starts empty.

Any change to the stored shape bumps `version` and ships a migration in the same PR. A shape change is anything an older file wouldn't satisfy or an older app would misread: a new required field, a removed or renamed field, a new allowed value, a changed meaning or format. The rules:

- **One step per version.** A migration is a pure function in `src/domain/` that turns a version-`n` file into a version-`n+1` file. On load, the app runs the steps in order from the file's version up to the current one, then validates the result as the current version. A version-1 file opened by version 5 goes 1 → 2 → 3 → 4 → 5.
- **Shipped migrations are frozen.** Once a release has shipped a version, its shape and its migration never change. Fix mistakes with a new version.
- **Migrations keep data.** Every ticket and every field value survives, moved or converted into the new shape. Pick a default for a new field that matches what the old app meant (a ticket without a new `priority` field had normal priority).
- **Back up before the first migrated save.** Before saving a file that was migrated, keep the original as `tasks.v<n>.backup.json` beside it, so a migration bug never costs the user their data.
- **Test from a fixture.** Each migration gets a `*.test.ts` with a sample file of the old version, committed as it was written, that migrates to the expected new file. Keep a test that migrates the version-1 fixture all the way to the current version.
- **Move the current version everywhere.** Update `DataFile` in `src/shared/types.ts`, `emptyDataFile` and `parseDataFile` in `domain/validate.ts`, and the data model above.

## Main process (`electron/`)

- **`main.ts`** sets up a single-instance app with one window. The window is frameless on Linux and Windows, where the UI draws its own title bar and window buttons, and uses the native traffic lights on macOS. The window is locked down: context isolation and sandbox are on, Node integration is off, new windows are denied and navigation away from the app is blocked. It loads `dist/renderer/browser/index.html` from `file://`. With `--dev` it loads the Angular dev server at `http://localhost:4200` instead. The data directory is always `<appData>/quokka-tasks`, unless `--user-data-dir` is passed.
- **`storage.ts`** reads and writes `tasks.json` in that directory. Writes are queued so the last save wins. Each write goes to a temp file, is fsynced and is then renamed over the real file, so a crash leaves either the old or the new file. If the file can't be parsed, it is renamed to `tasks.corrupt-<timestamp>.json` and the app starts empty with a notice.
- **`preload.ts`** exposes `window.api` (the `TasksApi` from `src/shared/api.ts`) through `contextBridge`. A sandboxed preload can only `require('electron')`, so it repeats the IPC channel names. A `satisfies` check makes the compiler prove they match `src/shared/api.ts`.

### IPC

The channels are in `IPC` in `src/shared/api.ts`:

- `tasks:load` and `tasks:save` load and save the whole `DataFile`. There are no partial updates.
- `app:flush-request` and `app:flush-done` run the close handshake. When the window closes, the main process asks the UI to flush pending edits, waits for the UI and then for the storage queue to drain, and only then closes. A 2-second timeout bounds the whole sequence.
- `window:*` carries the minimize, maximize and close buttons and maximize-state updates for the frameless window.

## UI (`src/app/`)

Angular with standalone components, signals and no zone.js. Templates are inline in the `.ts` files. All styles are in `src/styles.css`.

### State

- **`TasksStore`** is the single source of truth for tickets. `init()` loads the file, applies rollover and the completed sink, and saves if anything moved. Every edit goes through `change(fn)`: `fn` is a pure function from `src/domain/` that returns the new ticket array. The store re-applies rollover and the completed sink, updates the signal and saves the whole file. The store also tracks `today` and checks it every minute and on window focus, so rollover still happens when the app stays open past midnight. It exposes `notice`, `saveError` and `loadError` for the banners. Nothing is saved after a load error.
- **`Board`** is shared by the shell and the pages. It holds which ticket the editor shows and handles drag-and-drop drops. Drops into a past day are refused (`domain/drop.ts`).

### Routing

The router uses hash URLs: `#/day/2026-11-26` and `#/week/2026-11-23`, where a week is identified by its Monday. Path URLs break on reload under `file://`. Guards in `app.routes.ts` send invalid dates to today and snap a week URL to its Monday. Anything else redirects to today's Day view, which is the start screen. View arithmetic (next, previous, today, switching between day and week, following today across midnight) is in `domain/views.ts`.

### Components

- **`App`** (the shell): title bar (`AppHeader`, `WindowControls`), banners, the routed page beside the backlog list, and the ticket editor. One `cdkDropListGroup` spans the routed page and the backlog, so tickets can be dragged between any of their lists.
- **`DayPage`**: one day, as a list of `DayRow`s. On today, `NowBlock` shows the ticket to work on (`nowTicket` in `domain/day.ts`) and Up next lists the other open tickets. Other future days show a Planned list instead, and every day shows its Done list. Past days are read-only. Up next hides the Now ticket, so `upNextToIndex` maps its drop indexes back to positions in the day.
- **`WeekPage`**: seven `TicketList`s, Monday to Sunday.
- **`TicketList`** and **`TicketCard`**: a list of draggable cards with completed cards locked at the bottom, plus **`AddTicket`** for creating tickets. The backlog is a `TicketList` with date `null`.
- **`FocusView`**: the modal ticket editor. Title and description edits save after 400 ms. Status changes save immediately. Delete asks first through **`ConfirmDialog`**.

## Build and packaging

- `ng build` compiles the UI into `dist/renderer/browser/`.
- `tsc -p tsconfig.electron.json` compiles `electron/`, `src/domain/` and `src/shared/` into `dist/electron/`. The entry point is `dist/electron/electron/main.js`, set as `main` in `package.json`.
- Electron Forge (`forge.config.js`) only packages the app. It ships just `package.json` and `dist/` in an asar. The makers produce a `.deb` and zips. macOS builds are signed ad hoc.
- All dependencies are devDependencies: the UI is bundled, and the main process uses only Node built-ins and Electron.
