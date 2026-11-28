# Ticket fields: priority, estimate, link (design)

Stage 2 of enriching the ticket modal. Stage 1 (date picker, timestamps) is `2026-11-28-focus-date-picker-design.md`, PR #21. Later stages: (3) due time and reminders, (4) comments, (5) attachments.

## Intent

The user wants three more pieces of information on a ticket: a **priority**, an **estimate** and a **link**. All three are **notes on the ticket**. Nothing sums, sorts or filters by them, and they appear **only in the focus view**. Cards, Day rows and headers don't change.

Adding stored fields changes the shape of `tasks.json`, so this stage also ships the app's **first data migration** (version 1 → 2) and the migration machinery that `docs/architecture.md` ("Versioning and migrations") already describes.

## Goals

- In the focus view, as drafts applied on Save like the other fields:
    - **Priority:** a select with High / Normal / Low. Default Normal.
    - **Estimate:** free text, e.g. "30 min", "2h", "half a day". It may be empty. No parsing or units.
    - **Link:** one URL, may be empty. An **Open** control opens it in the system browser.
- `tasks.json` goes to `version: 2`. Every version-1 file loads, migrates and keeps every ticket and field value.
- The original version-1 file is kept as `tasks.v1.backup.json` before the first save of the migrated data.

## Non-goals

- Priority doesn't change list order, cards, Day rows or Now/Up next. List order stays the drag order.
- No totals or arithmetic on estimates. No URL previews or titles. Only one link per ticket.
- No downgrade path. An older app still treats a version-2 file as corrupt (it sets the file aside and starts empty). That is the existing policy and isn't changed here.

## Anti-goals

- **Losing data in the migration.** No ticket or field value may disappear. The backup must exist before anything overwrites the version-1 file.
- **Weakening the window lockdown.** Only `http:` and `https:` URLs may leave the app. Anything else (`file:`, `javascript:`, custom schemes) is denied. In-app navigation stays blocked.

## Constraints

- Project rules from `AGENTS.md`: domain purity, all styles in `src/styles.css` with tokens, no new dependencies, hash routing, Conventional Commits, PR to `main`.
- Branch `feat/ticket-fields`, built on `feat/focus-date-picker` (PR #21), because both change `FocusView` and `saveTicketEdits`. Rebase onto `main` after #21 merges.

## Approaches

**Opening the link:**

- **A. A plain `<a href target="_blank">`, routed by the existing `setWindowOpenHandler`. Picked.** `main.ts` currently denies every new window. It will call `shell.openExternal(url)` for `http(s)` URLs and still return `{ action: 'deny' }` for everything, so no Electron window is ever created. There's no new IPC channel or preload change, and the one gate for anything leaving the app stays in one place.
- B. A dedicated `shell:open-external` IPC call. More explicit, but it touches `api.ts`, `preload.ts` and `main.ts`, and leaves two separate exit paths to keep locked down.

**Migration machinery** (one sensible way): a pure step chain in `src/domain/`, then validation of the current version.

- Optional fields with read-time defaults were rejected: the project rule says any shape change bumps the version.
- A schema library was rejected: it's a new dependency doing ~30 lines of work.

## Data model (version 2)

```ts
type Priority = 'high' | 'normal' | 'low';
const PRIORITIES: readonly Priority[] = ['high', 'normal', 'low'];
const PRIORITY_LABEL: Record<Priority, string> = { high: 'High', normal: 'Normal', low: 'Low' };

interface Ticket {
    // ...all version-1 fields unchanged...
    priority: Priority;
    /** Free text; '' when not set. */
    estimate: string;
    /** A URL as typed; '' when not set. Not validated on save. */
    link: string;
}
interface DataFile {
    version: 2;
    tickets: Ticket[];
}
```

The **1 → 2 migration** sets `priority: 'normal'`, `estimate: ''` and `link: ''` on every ticket, and changes nothing else (including `updatedAt`). It overwrites any stray key with one of these names, because version 1 never defined them, so there's no real data to lose _(designer's call)_. Normal matches what the old app meant: every ticket had ordinary priority.

`createTicket` gives new tickets the same defaults.

## Loading and migrating

- `src/domain/migrate.ts`:
    - An ordered list of steps. Step 1 → 2 is a pure function over the raw parsed object.
    - `migrate(raw)` runs the steps from the file's `version` up to `CURRENT_VERSION` and reports whether it changed anything and the original version.
    - A file with a missing, non-integer, below-1 or above-current version is not migrated. It goes through the existing corrupt path. A step only sets fields. It never validates or deletes anything: validation happens once, after the chain, as the current version.
- `parseDataFile` becomes: JSON parse → `migrate` → validate as version 2 → repair positions. It returns the data together with the original version, so storage knows a migration happened.
- `storage.ts` `load()`: when the file was migrated, copy the original bytes to `tasks.v<n>.backup.json` (n = original version) **before** returning. A migrated file is never saved over before its backup exists. If the copy fails, load fails the same way an unreadable file does today, and nothing is saved.
    - If `tasks.v1.backup.json` already exists (e.g. the user downgraded, made changes, then upgraded again), the new backup gets a timestamp: `tasks.v1.backup-<timestamp>.json`. An earlier backup is never overwritten.
- Right after the backup, `load()` saves the migrated version-2 data through the normal atomic write _(designer's call)_. Otherwise a user who opens the app and changes nothing keeps a version-1 file on disk, and every launch would migrate it again and write another backup. This stays inside `storage.ts`, with no IPC or store change. If that save fails, load still returns the migrated data, and the next save retries as usual.

## Focus view

New drafts load with the others when a ticket opens and are applied by Save. `TicketEdits` gains `priority`, `estimate` and `link`, and `saveTicketEdits` applies them. The estimate and link are stored trimmed.

Layout, under Date and above Description:

```
Date      [11/28/2026] [ ] No date (backlog)
Priority  [Normal ▾]
Estimate  [2h                    ]
Link      [https://…             ] Open
Description
```

- **Open** is an `<a target="_blank" rel="noopener">` with the draft link as `href`. It's shown only when the draft link is an openable `http(s)` URL. Otherwise it's hidden, and the field can still hold any text.
- Placeholders: the estimate field shows `e.g. 2h`, the link field `https://…`.

## Opening links (`electron/main.ts`)

`setWindowOpenHandler(({ url }) => { if (isOpenableUrl(url)) shell.openExternal(url); return { action: 'deny' }; })`. `isOpenableUrl(url: string): boolean` is a pure function in `src/domain/links.ts` (true only if `new URL(url)` parses and its protocol is `http:` or `https:`). The UI uses the same function to decide whether to show Open. `will-navigate` stays as it is.

## Tests

- `migrate.test.ts`: a committed version-1 fixture (`src/domain/fixtures/tasks.v1.json`, a realistic file with backlog, open, completed and past-day tickets) migrates to the expected version-2 file. It also covers: the current version passes through unchanged; future, missing and garbage versions are rejected.
- `validate.test.ts`: version 2 is accepted. A ticket with a missing or invalid `priority`, or a non-string `estimate`/`link`, is rejected.
- `storage.test.ts`: loading a version-1 file writes the backup with the original bytes and leaves `tasks.json` at version 2; a second load makes no new backup; an existing backup isn't overwritten; a version-2 file creates no backup.
- `links.test.ts`: http and https are allowed; `file:`, `javascript:`, relative and empty strings are not.
- `tickets.test.ts`: `saveTicketEdits` applies priority, estimate and link (trimmed); `createTicket` sets the defaults.

## Docs

Update `docs/architecture.md`:

- **Data model:** version 2 and the new fields.
- **Versioning and migrations:** remove "Today only version 1 exists". Describe `migrate.ts` and the backup naming.
- **Main process:** new windows are denied, and `http(s)` links open in the system browser.
- **FocusView** entry: the new fields.

## Left to the builder

- Exact internal names inside `migrate.ts` and the shape of its return value.
- Exact styles for the Open link and the field spacing, within the style guide.
- Fixture contents beyond the cases listed above.
