# Quokka Tasks — Design (iteration 1)

Date: 2026-11-26
Status: draft, awaiting approval
Completed-ticket behaviour: see `2026-11-26-completed-tickets-design.md`.
Stack: chosen by the user in conversation on 2026-11-26 (Electron + Angular, with the picks below). The first implementation step updates `CLAUDE.md` to record it.

## Intent

A personal tasks app that runs natively on the user's own computer, fully offline. The user plans their work week by placing tickets on calendar days and keeps undated work in a backlog. One user, one machine, one local data file. Today that machine runs Ubuntu; later it may be Windows or macOS, so nothing may be tied to Linux.

The first iteration is deliberately plain. Visual polish comes in a later iteration, so the structure should make restyling easy (keep styles in CSS, not scattered inline), but no time goes into looks now.

## Goals

- A **week view**: seven real calendar days (Monday–Sunday), each holding an ordered list of tickets. Navigate to previous/next weeks; jump back to the current week.
- A **backlog**: an ordered bucket of tickets that have no date.
- **Tickets** with a title, a description and a status (Pending / In Progress / Completed).
- **Cards** show the title, the status, and a small priority marker. They do not show the description.
- Clicking a card opens a **focus view** to view and edit the ticket.
- Create, edit and delete tickets.
- **Drag and drop** to move tickets between days, between a day and the backlog, and to reorder within a list. Order within a list is priority.
- **Rollover**: unfinished tickets from past days move to today automatically.
- Works with no network connection, ever.

## Non-goals (iteration 1)

Sync, accounts or multiple users; recurring tickets; tags, labels or colours per ticket; due times; search or filtering; notifications or reminders; markdown or rich text in descriptions; undo; import/export; multiple windows; settings screen; theming or visual polish; Windows/macOS installers (the code must stay portable, but only Linux packages are built now).

## Anti-goals

- **Losing data.** A crash, power cut or bad file must never wipe the user's tickets.
- **Needing the network.** No CDN scripts, remote fonts, telemetry or update checks.
- **Platform lock-in.** No Linux-only APIs or paths; use Electron/Node APIs that work on all three OSes.

## Constraints

- Single user, single local instance.
- The user is comfortable in JavaScript; the stack stays in the JS/TS world.
- Project rules (`CLAUDE.md`): Conventional Commits; feature branches merged through PRs; ask before adding dependencies beyond those approved here.

## Approaches considered

| Approach                   | Trade-off                                                                                                                                                                                             | Verdict                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Electron**               | Bundles Chromium + Node: ~100 MB install, ~150 MB RAM. All JS; identical rendering and drag-and-drop on every OS; most mature ecosystem.                                                              | **Chosen**                                                                            |
| Tauri                      | Uses the OS's own webview: ~5–10 MB, light on memory. Needs the Rust toolchain; each OS has a different web engine (WebKitGTK on Linux is the quirkiest), so drag-and-drop and CSS can differ per OS. | Rejected: cross-OS consistency and staying all-JS matter more than size for one user. |
| Local web server + browser | Not a native app; the user would have to start a server.                                                                                                                                              | Rejected                                                                              |
| Flutter / non-JS native    | Leaves the language the user is comfortable with.                                                                                                                                                     | Rejected                                                                              |

UI framework (within Electron):

| Option                                  | Trade-off                                                                                                                                                            | Verdict                         |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| React + dnd-kit + Forge's Vite template | Smallest, one build tool for everything.                                                                                                                             | Initially picked, then replaced |
| **Angular + CDK drag-drop**             | Two build tools (Angular CLI for UI, `tsc` + Forge for the shell); more boilerplate. First-party drag-drop built for connected lists; the user knows Angular better. | **Chosen**                      |

## Stack (decided)

- **Electron** (main process + preload in TypeScript, compiled with `tsc`).
- **Angular** for the UI (standalone components, signals, zoneless), built with the Angular CLI. Chosen over React because the user knows Angular better and will maintain and restyle the app.
- **Angular CDK drag-drop** (`@angular/cdk`) for drag and drop: connected sortable lists, exactly the week + backlog shape.
- **Electron Forge** only for packaging (`.deb` and zip makers). The Angular CLI builds the UI; Forge packages the compiled output.
- **TypeScript** everywhere.
- **Storage:** one JSON file in Electron's `userData` directory (`~/.config/quokka-tasks/tasks.json` on Ubuntu).
- **npm** as package manager, using the public npm registry via a project `.npmrc` (the user's global config points at a local registry).
- **Vitest** for unit tests of the framework-free logic.
- No linter in iteration 1 (strict TypeScript and Angular strict templates act as the static check); `angular-eslint` can be added later with approval.

Approved packages: `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/platform-browser`, `@angular/forms`, `@angular/cdk`, `rxjs`, `tslib` (all bundled into the UI, so kept as devDependencies), and dev tools `@angular/cli`, `@angular/build`, `@angular/compiler-cli`, `typescript`, `vitest`, `electron`, `@electron-forge/cli`, `@electron-forge/maker-deb`, `@electron-forge/maker-zip`, `@types/node`. Any other dependency needs the user's approval first.

## Behaviour

### Data model

```ts
type Status = 'pending' | 'in_progress' | 'completed';

interface Ticket {
    id: string; // crypto.randomUUID()
    title: string; // required, trimmed, non-empty
    description: string; // plain text, may be empty
    status: Status;
    date: string | null; // local calendar date 'YYYY-MM-DD'; null = backlog
    position: number; // 0-based index within its list (its day, or the backlog)
    createdAt: string; // ISO timestamp
    updatedAt: string; // ISO timestamp
}

interface DataFile {
    version: 1;
    tickets: Ticket[];
}
```

A "list" is either one calendar date or the backlog. Within a list, `position` values are contiguous (0, 1, 2, …); any operation that changes a list renumbers it. Position 0 is the highest priority.

All dates are **local** calendar dates (the computer's timezone), never UTC dates.

### Week view

```
◀ Week 48 · 23–29 Nov 2026 ▶   [Today]
┌─Mon 23─┬─Tue 24─┬─Wed 25─┬─Thu 26─┬─Fri 27─┬─Sat 28─┬─Sun 29─┐   ┌─Backlog──┐
│1 Fix X │        │        │1 Call A│        │        │        │   │1 Idea    │
│ ●Done  │        │        │ ●Prog  │        │        │        │   │ ●Pend    │
│        │        │        │2 Email │        │        │        │   │2 Refactor│
│        │        │        │ ●Pend  │        │        │        │   │ ●Pend    │
│        │        │        │ + add  │ + add  │ + add  │ + add  │   │ + add    │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘   └──────────┘
```

- Weeks run Monday–Sunday. The header shows the ISO week number and the date range, with previous/next arrows and a **Today** button that returns to the current week.
- Today's column is visibly marked.
- The app opens on the current week.

### Backlog

- An ordered list of tickets with `date = null`, with its own **+ add**.
- Displayed as a panel beside the week (sketch above), so tickets can be dragged between it and the days. _(Designer's call: drag and drop between backlog and days needs both on screen at once, so the backlog is a panel rather than a separate page.)_

### Cards

- Show: priority number (`position + 1`), title, status as a small coloured dot plus label (grey = Pending, blue = In Progress, green = Completed).
- Long titles are truncated with an ellipsis on the card; the full title is in the focus view.
- Clicking a card opens the focus view. Dragging a card does not open it.
- Completed cards sit at the bottom of their list (below all open tickets) and can't be dragged.

### Creating

- **+ add** at the bottom of each day column and of the backlog opens an inline title input. Enter creates the ticket; Escape or an empty title cancels.
- New tickets get status Pending and go to the **bottom** of that list (lowest priority).
- Past days have no **+ add** (see "Past days" below).

### Focus view

- A modal over the current view, showing: title (editable), description (multi-line plain text, editable), status (selectable), and the ticket's date or "Backlog".
- Edits save automatically as the user types (debounced). An empty title is not saved; the field shows it is required and the previous title is kept.
- Close with a close button, Escape, or clicking outside. Closing flushes any pending (debounced) edit immediately.
- **Delete** button in the focus view; asks for confirmation in an in-app dialog before deleting.

### Drag and drop

- Drag a card within a list to reorder it.
- Drag a card to another day (in the visible week) or to/from the backlog to move it; it lands where it is dropped.
- Moving a ticket between weeks is done by dropping it in the backlog, navigating, and dragging it out again. (No cross-week drag in this iteration.)
- **Past days** (dates before today) are not drop targets. Rollover leaves only completed tickets there, and those are locked (see below).
- Completed tickets can't be dragged; set the status back first. Open tickets dropped at or below the completed pile land just above it.

### Rollover

Invariant: **no ticket with status Pending or In Progress has a date before today.**

- Enforced on app start, when the local date changes while the app is running (checked at least every minute and when the window regains focus), and after any change to the data (e.g. a past Completed ticket set back to Pending).
- Offending tickets move to today and are placed at the **top** of today's list, ahead of tickets already there. Among themselves they keep their order: earlier original date first, then original position.
- Completed tickets stay on their original day, at the bottom of it, as a record.
- _(Designer's call)_ If the date changes while the app is open and the user is viewing the week that contained the old "today", the view follows to the week containing the new today. If they're viewing some other week, the view stays put.

### Storage

- The main process owns the data file. The renderer has no Node access; it talks to the main process through a small API exposed by the preload script (`contextIsolation: true`, `nodeIntegration: false`).
- On every change the whole `DataFile` is saved: write to a temp file in the same directory, then rename it over `tasks.json` (atomic replace).
- Missing file on start: begin with an empty `DataFile`.
- Unreadable or invalid file on start: rename it to `tasks.corrupt-<timestamp>.json`, start empty, and show a one-line notice naming the backup. Never overwrite the unreadable file.
- The `version` field allows future migrations.
- **Validation on load** _(designer's call)_: the file must parse as JSON with `version: 1` and every ticket must have the fields and types above. Anything else is treated as unreadable (backup + start empty, as above). The one repair allowed: positions are renumbered per list on load, since gaps or duplicates there are harmless to fix.
- **Save failure** _(designer's call)_: keep the in-memory data, show a persistent error banner ("Couldn't save — your latest changes are not on disk"), and retry on the next change. Clear the banner on the next successful save.
- **Quitting** _(designer's call)_: pending edits are flushed and written before the app exits.
- **Single instance** _(designer's call)_: only one copy of the app may run (Electron's single-instance lock); launching again focuses the existing window. This prevents two processes writing the same file.

### Security / offline

- No remote content is loaded. A Content-Security-Policy restricts scripts and styles to the app itself.
- External navigation and new windows are blocked.

## Testing

- Vitest unit tests for the domain logic: list ordering and renumbering, moves between lists, rollover (including order of rolled-over tickets and date changes), week calculation (Monday start, ISO week number, local dates), and the storage layer (atomic write, missing file, corrupt file).
- Keep domain logic in plain TypeScript modules with no Angular or Electron imports, so it is testable without either and shared by both processes.

## Packaging

- `npm start` builds everything and runs the app. `npm run dev` runs it against the Angular dev server (with `ng serve` running) for live reload.
- `npm run make` produces a Linux package (`.deb`, plus a zip) via Electron Forge. Windows and macOS makers are not configured in this iteration, but nothing in the code should prevent adding them.

## Left to the builder

- Project layout and module boundaries (beyond keeping domain logic framework-free).
- State management inside Angular (a signal-based service is enough; no extra state library without approval).
- IPC API shape (e.g. `load()` / `save(data)` vs. finer-grained operations).
- Exact debounce interval, styling details within "plain", and component structure.
- Updating `CLAUDE.md` with the build, test and run commands once they exist.
