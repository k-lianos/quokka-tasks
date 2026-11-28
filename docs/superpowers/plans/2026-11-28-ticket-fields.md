# Ticket Fields (Priority, Estimate, Link) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add priority, estimate and link to tickets, edited only in the focus view. Ship data version 2 with the app's first migration and a backup of the version-1 file.

**Architecture:**

- A pure step chain in `src/domain/migrate.ts` lifts any older file to version 2 before `parseDataFile` validates it.
- `electron/storage.ts` backs up the original file and immediately saves the migrated one.
- Links leave the app only through `setWindowOpenHandler`, gated by a pure `isOpenableUrl`.

**Tech Stack:** Angular (standalone, signals, zoneless), Electron, TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-28-ticket-fields-design.md`

## Global Constraints

- `src/domain/` and `src/shared/` import nothing from Angular, Electron, Node or the DOM. Test files are excluded from both builds and may use `node:fs` for fixtures.
- No new dependencies. Styles only in `src/styles.css`, tokens only.
- Migration defaults, exactly: `priority: 'normal'`, `estimate: ''`, `link: ''`. Set unconditionally, nothing else changed (including `updatedAt`).
- Backup names, exactly: `tasks.v<n>.backup.json`. If that exists: `tasks.v<n>.backup-<stamp>.json`, where `<stamp>` = `new Date().toISOString().replace(/[:.]/g, '-')` (same as the corrupt-file stamp). Never overwrite a backup.
- Only `http:` and `https:` URLs may open externally. `setWindowOpenHandler` always returns `{ action: 'deny' }`.
- UI copy, exactly:
    - labels `Priority`, `Estimate`, `Link`;
    - options `High`, `Normal`, `Low`;
    - placeholders `e.g. 2h` and `https://…`;
    - the link control text `Open`.
- Branch `feat/ticket-fields` (on top of `feat/focus-date-picker`). Conventional Commits. Verify with `npm test && npm run build`.

## Review Focus

- **The save right after migration fails** (disk full, read-only folder): load must still return the migrated data, the backup must exist, and the next normal save writes version 2. Pinned in Task 2.
- **A link typed without a scheme** (`www.example.com`, `example.com/x`): Open stays hidden. Nothing opens or navigates. Pinned in Task 3.
- **A file from a newer app** (`version: 3`): it still goes through the existing corrupt path, and no backup is written. Pinned in Tasks 1 and 2.
- **A second launch after a migration:** no new backup, and `tasks.json` is already version 2. Pinned in Task 2.
- **Unsaved link draft:** Open uses the draft text as typed, and closing the modal without Save still discards all of the new fields. Checked by hand in Task 4.

---

### Task 1: Data model v2, migration chain, validation

**Files:**

- Modify: `src/shared/types.ts`, `src/domain/validate.ts`, `src/domain/validate.test.ts`, `src/domain/testUtils.ts`, `src/domain/tickets.ts` (`createTicket`), `src/domain/tickets.test.ts`, `src/app/tasks.store.ts` (the `version: 1` in save), `electron/storage.ts` (adapt to the new `parseDataFile` return only), `electron/storage.test.ts` (version literals only)
- Create: `src/domain/migrate.ts`, `src/domain/migrate.test.ts`, `src/domain/fixtures/tasks.v1.json`
- Docs: `docs/architecture.md`, "Data model" and "Versioning and migrations"

**Interfaces:**

- Produces in `src/shared/types.ts`:
    - `type Priority = 'high' | 'normal' | 'low'`;
    - `const PRIORITIES: readonly Priority[] = ['high', 'normal', 'low']`;
    - `const PRIORITY_LABEL: Record<Priority, string>` (`High` / `Normal` / `Low`);
    - `Ticket` gains `priority: Priority; estimate: string; link: string`;
    - `DataFile` is `{ version: 2; tickets: Ticket[] }`.
- Produces in `src/domain/migrate.ts`:
    - `export const CURRENT_VERSION = 2`;
    - `export function migrate(raw: unknown): { file: unknown; fromVersion: number } | null`. Returns `null` when `raw` isn't an object with an integer `version` from 1 to `CURRENT_VERSION`. Otherwise it runs steps `fromVersion → CURRENT_VERSION` and returns the result (unvalidated). Steps are kept in an array indexed by source version. The 1 → 2 step only sets the three defaults on each element of `tickets` that is an object. A non-array `tickets` passes through for validation to reject.
- Produces in `src/domain/validate.ts`:
    - `export function parseDataFile(text: string): { data: DataFile; fromVersion: number } | null`. JSON parse → `migrate` → validate as v2 → `renumberAll`.
    - `emptyDataFile()` returns `{ version: 2, tickets: [] }`.

- [ ] **Step 1: Write the fixture** `src/domain/fixtures/tasks.v1.json`. A realistic version-1 file (2-space JSON) with 5 tickets:
    - a backlog ticket with a description;
    - an open ticket on `2026-11-26` and a completed one on the same day;
    - an in-progress ticket on `2026-11-30`;
    - a completed ticket on a past day `2026-11-02`.

    Use distinct `createdAt`/`updatedAt` values. Commit it as written and never edit it after this task.

- [ ] **Step 2: Write the failing tests** in `migrate.test.ts`:
    - `the v1 fixture migrates to v2 keeping every field`: read the fixture with `readFileSync(new URL('./fixtures/tasks.v1.json', import.meta.url), 'utf8')`. Expect `migrate(JSON.parse(text))` to have `fromVersion: 1` and a file equal to the fixture with `version: 2` and each ticket `{ ...original, priority: 'normal', estimate: '', link: '' }`.
    - `the v1 fixture parses all the way to the current version`: `parseDataFile(text)` is not null, `fromVersion` is 1, `data.version` is `CURRENT_VERSION`, there are 5 tickets, and every `updatedAt` equals the fixture's.
    - `stray v1 keys are overwritten by the defaults`: a v1 ticket with `priority: 'urgent', estimate: 5` migrates to `'normal'` / `''`.
    - `current version passes through unchanged`: a v2 object comes back deep-equal with `fromVersion: 2`.
    - `unknown versions are rejected`: `migrate` returns `null` for each of `{ version: 3 }`, `{ version: 0 }`, `{ version: 1.5 }`, `{ version: '1' }`, `{}`, `null` and `[]`.

- [ ] **Step 3: Update `validate.test.ts`**:
    - Switch the `good`/`withTicket` builders to `version: 2`. `makeTicket` gets the three defaults in `testUtils.ts`.
    - `emptyDataFile` expects version 2.
    - Valid parse reads `.data.tickets`.
    - Add rejections: `withTicket({ priority: 'urgent' })`, `withTicket({ priority: undefined })`, `withTicket({ estimate: 3 })`, `withTicket({ link: null })`, and `{ ...good, version: 3 }`.
    - Drop the old `version: 2` rejection.

    Add to `tickets.test.ts`: `createTicket sets priority normal, empty estimate and link`.

- [ ] **Step 4: Run and confirm they fail.** Run `npx vitest run src/domain`. Expected: FAIL. `migrate` is missing, and the validation and createTicket assertions fail.

- [ ] **Step 5: Implement.**
    - Write the types, `migrate.ts`, the `parseDataFile`/`emptyDataFile` changes and the `isTicket` checks for the three fields.
    - Add the `createTicket` defaults.
    - In `tasks.store.ts`, save `version: 2`. Use `CURRENT_VERSION` where the literal type allows; otherwise `2` (it is type-checked against `DataFile`).
    - `storage.ts`: use `parsed.data` for now. The backup comes in Task 2.
    - `storage.test.ts`: change the version literals to 2.

- [ ] **Step 6: Docs.** In `docs/architecture.md`:
    - Data model: version 2 and the three fields.
    - Versioning: replace "Today only version 1 exists, so there are no migrations yet. `parseDataFile` accepts only `version: 1`." with a description of `migrate.ts`. Keep the corrupt-path sentence for unknown versions.

- [ ] **Step 7: Verify.** Run `npm test && npm run build`. Expected: all PASS, both builds succeed.

- [ ] **Step 8: Commit**: `git commit -m "feat: data version 2 with priority, estimate and link, and the first migration"`

---

### Task 2: Storage — back up the original file and save the migrated one

**Files:**

- Modify: `electron/storage.ts`, `electron/storage.test.ts`
- Docs: `docs/architecture.md`, `storage.ts` bullet and "Back up before the first migrated save"

**Interfaces:**

- Consumes: `parseDataFile(text): { data; fromVersion } | null` and `CURRENT_VERSION` from Task 1.
- Produces: no new exports. `load()` behaviour when `fromVersion < CURRENT_VERSION`:
    1. Write the **original text** to the first free name: `tasks.v<fromVersion>.backup.json`, else the stamped name. Use the `wx` flag so an existing file is never overwritten, and fall back to the stamped name on `EEXIST`. Then fsync it. If this throws, `load()` rejects, and `tasks.json` is untouched.
    2. Then await the store's own `save(data)` (the queued write) so it goes through the normal queue. If that save rejects, swallow it and still return `{ data, notice: null }`.

- [ ] **Step 1: Write the failing tests** in `storage.test.ts`, writing v1 text with `fs.writeFile(path.join(dir, 'tasks.json'), v1Text)`. For `v1Text`, a small inline v1 file is enough. Tests:
    - `a v1 file is backed up byte-for-byte and saved as v2`:
        - The backup content `=== v1Text`.
        - `tasks.json` parses with `version: 2`.
        - The loaded data has version 2.
    - `a second load makes no new backup`: load twice. Only one `tasks.v1.backup*.json` exists.
    - `an existing backup is never overwritten`:
        - Pre-create `tasks.v1.backup.json` with `'old'`, then load v1.
        - The `'old'` file is unchanged.
        - A `tasks.v1.backup-<stamp>.json` holding `v1Text` exists.
    - `a v2 file creates no backup`.
    - `a future-version file takes the corrupt path and creates no backup`.
    - `a failed save after migration still returns the data`:
        - Pre-create a **directory** named `tasks.json.tmp`, so the temp-file open fails while the backup write succeeds.
        - Expect `load()` to resolve with v2 data, the backup to exist, and `tasks.json` still to hold `v1Text`.

- [ ] **Step 2: Run** `npx vitest run electron/storage.test.ts`. Expected: the new tests FAIL (no backup, file still v1).

- [ ] **Step 3: Implement** the two-phase load above in `storage.ts`. The `stamp` helper is shared with the corrupt path.

- [ ] **Step 4: Docs.** Update the `storage.ts` bullet: migrated loads back up the original, then save. Update the backup rule with the exact names, and say it happens at load.

- [ ] **Step 5: Verify.** Run `npm test`. Expected: all PASS.

- [ ] **Step 6: Commit**: `git commit -m "feat: back up a migrated data file and save it as the new version"`

---

### Task 3: Opening links in the system browser

**Files:**

- Create: `src/domain/links.ts`, `src/domain/links.test.ts`
- Modify: `electron/main.ts` (the `setWindowOpenHandler` line, ~79; import `shell`)
- Docs: `docs/architecture.md`, `main.ts` bullet ("new windows are denied")

**Interfaces:**

- Produces: `export function isOpenableUrl(url: string): boolean`. True only if `new URL(url)` doesn't throw and `protocol` is `http:` or `https:`. `URL` is a standard global in both Node and the browser.

- [ ] **Step 1: Write the failing test** `links.test.ts`:
    - `http and https urls are openable`: `https://example.com/a?b=1` and `http://localhost:3000` are true.
    - `everything else is not`: `''`, `'   '`, `www.example.com`, `example.com/x`, `/relative`, `file:///etc/passwd`, `javascript:alert(1)`, `mailto:a@b.c` and `ftp://x.y` are all false.

- [ ] **Step 2: Run** `npx vitest run src/domain/links.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `isOpenableUrl`. In `main.ts`:

    ```ts
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (isOpenableUrl(url)) void shell.openExternal(url);
        return { action: 'deny' };
    });
    ```

    Update the lock-down comment: no app windows; http(s) links go to the system browser.

- [ ] **Step 4: Docs.** Update the `main.ts` bullet.

- [ ] **Step 5: Verify.** Run `npm test && npm run build`. Expected: PASS.

- [ ] **Step 6: Commit**: `git commit -m "feat: open http(s) links in the system browser"`

---

### Task 4: Focus view fields

**Files:**

- Modify: `src/domain/tickets.ts` (`TicketEdits`, `saveTicketEdits`), `src/domain/tickets.test.ts`, `src/app/focus-view.ts`, `src/styles.css`
- Docs: `docs/architecture.md`, `FocusView` bullet

**Interfaces:**

- Consumes: `Priority`, `PRIORITIES`, `PRIORITY_LABEL` (Task 1) and `isOpenableUrl` (Task 3).
- Produces: `TicketEdits` gains `priority: Priority; estimate: string; link: string`. `saveTicketEdits` stores them, with `estimate` and `link` trimmed. A change to only these fields still bumps `updatedAt`, and the same-values case still returns the same array.

- [ ] **Step 1: Write the failing tests** in `tickets.test.ts`. The existing `edits()` helper picks up the three fields from the ticket. Tests:
    - `saveTicketEdits stores priority, estimate and link, trimmed`: `{ priority: 'high', estimate: '  2h ', link: ' https://x.y ' }` gives `'high'`, `'2h'`, `'https://x.y'`, and `updatedAt: NOW`.
    - `saveTicketEdits with only an estimate change keeps the position`.

- [ ] **Step 2: Run** `npx vitest run src/domain/tickets.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** in `tickets.ts`. Extend `updateTicket`'s `Patch` with the three fields, so the no-change check covers them. `saveTicketEdits` passes them through.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: UI** in `focus-view.ts`:
    - Add `priority`, `estimate` and `link` draft signals. Load them in the existing effect and include them in `save()`'s edits.
    - Below the date note and above Description, in this order:
        - A `Priority` select over `PRIORITIES`, labelled with `PRIORITY_LABEL`.
        - An `Estimate` text input, placeholder `e.g. 2h`.
        - A `Link` row (`div.field`, since the label can't wrap two controls): a text input with placeholder `https://…`, plus `<a class="field-link" target="_blank" rel="noopener" [href]="link().trim()">Open</a>`. Render the anchor only when `isOpenableUrl(link().trim())`.
    - Styles in `src/styles.css`: a `.field-row` (input `flex: 1` plus the link with a gap) and `.field-link` (accent colour token, focus ring token). Tokens only.

- [ ] **Step 6: Docs.** Update the FocusView bullet with the three fields and Open.

- [ ] **Step 7: Verify.** Run `npm test && npm run build`. Expected: PASS. Then run the app against a scratch `--user-data-dir` seeded with the Task 1 fixture, and check by hand:
    1. On first launch, `tasks.v1.backup.json` equals the fixture and `tasks.json` is version 2.
    2. A second launch makes no new backup.
    3. Set High, `2h` and `https://example.com`, then Save. The values persist after reopening.
    4. Open appears only for the URL and hides for `example.com`.
    5. Clicking Open creates no app window. The click reaches the handler, which needs a stub or log in scratch only; don't commit it.
    6. Change all three, then close without saving. The values are discarded.

- [ ] **Step 8: Commit**: `git commit -m "feat: edit priority, estimate and link in the focus view"`
