# Focus View Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user set a ticket's day (or the backlog) from the focus view, allow past days only for completed tickets, and show created/updated dates.

**Architecture:** A new pure function in `src/domain/tickets.ts` applies the modal's whole draft (title, description, status, date) in one step, re-places the ticket when its date changes, and enforces the past-date rule itself. `FocusView` gets a `date` draft, a native `<input type="date">` with a "No date (backlog)" checkbox, a snap-to-today note and a timestamps line. Save calls the new domain function through `TasksStore.change`.

**Tech Stack:** Angular (standalone, signals, zoneless), TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-28-focus-date-picker-design.md`

## Global Constraints

- No change to `tasks.json` shape: `DataFile.version` stays `1`, no migration.
- No new dependencies.
- `src/domain/` imports nothing from Angular, Electron, Node or the DOM.
- All styles in `src/styles.css`, design tokens only, no raw colours (`docs/style-guide.md`).
- Drag-and-drop rules unchanged (`canDropInto` untouched).
- Note copy, exactly: `Past dates are only for completed tickets`.
- Checkbox label, exactly: `No date (backlog)`.
- Verification: `npm test && npm run build`. Conventional Commits on branch `feat/focus-date-picker`.

## Review Focus

- **Native input cleared** (user deletes the value; the input emits `''`): the draft date keeps its previous value. It must not become `null` or `''`. Only the checkbox means backlog.
- **Past date typed by keyboard on an open ticket** (`min` doesn't stop typing): the draft snaps to today and the note shows.
- **Midnight while the modal is open** with an open ticket drafted for "today": Save must not leave it on yesterday. The domain function snaps it to the new today (tested in Task 1).
- **Save with the same date and changed fields:** position unchanged, no reorder (tested in Task 1).
- **Completed ticket moved to another day or the backlog:** both lists stay contiguous and the ticket lands before the target's other completed tickets (tested in Task 1).

---

### Task 1: Domain — `isDateAllowed` and `saveTicketEdits`

**Files:**

- Modify: `src/domain/tickets.ts`
- Test: `src/domain/tickets.test.ts`

**Interfaces:**

- Consumes: existing `listOf`, `placeList`, `updateTicket` in `tickets.ts`; `Status`, `Ticket` from `src/shared/types.ts`.
- Produces:
    - `export function isDateAllowed(date: string | null, status: Status, today: string): boolean`: true when `date === null || date >= today || status === 'completed'`.
    - `export interface TicketEdits { title: string; description: string; status: Status; date: string | null }`
    - `export function saveTicketEdits(tickets: Ticket[], id: string, edits: TicketEdits, today: string, now: string): Ticket[]`

Behaviour of `saveTicketEdits`:

1. Unknown `id`: return `tickets` unchanged (same array).
2. Effective date = `edits.date` if `isDateAllowed(edits.date, edits.status, today)`, else `today`.
3. Apply title/description/status with the same rules as `updateTicket` (an empty or whitespace title is ignored, the title is trimmed).
4. If the effective date differs from the ticket's current date: renumber the source list without it, insert it in the target list at index = number of the target's open tickets (excluding itself), and set `updatedAt = now`. Unlike `moveTicket`, this works for completed tickets too.
5. If nothing changed (same fields, same date): return the same array.

- [ ] **Step 1: Write the failing tests** (in `tickets.test.ts`, using the file's `a`, `b`, `c`, `x`, `NOW`, `ids`, `listOf` fixtures; let `TODAY = '2026-11-26'`)

```ts
test('isDateAllowed allows backlog, today and future for any status, past only for completed', () => {
    expect(isDateAllowed(null, 'pending', TODAY)).toBe(true);
    expect(isDateAllowed(TODAY, 'in_progress', TODAY)).toBe(true);
    expect(isDateAllowed('2026-11-30', 'pending', TODAY)).toBe(true);
    expect(isDateAllowed('2026-11-25', 'pending', TODAY)).toBe(false);
    expect(isDateAllowed('2026-11-25', 'completed', TODAY)).toBe(true);
});

const edits = (t: Ticket, e: Partial<TicketEdits> = {}): TicketEdits => ({
    title: t.title,
    description: t.description,
    status: t.status,
    date: t.date,
    ...e,
});

test('saveTicketEdits returns the same array when nothing changes or the id is unknown', () => {
    expect(saveTicketEdits(all, 'a', edits(a), TODAY, NOW)).toBe(all);
    expect(saveTicketEdits(all, 'missing', edits(a, { title: 'z' }), TODAY, NOW)).toBe(all);
});

test('saveTicketEdits with the same date keeps the position', () => {
    const r = saveTicketEdits(all, 'a', edits(a, { title: 'A', description: 'd' }), TODAY, NOW);
    expect(ids(listOf(r, TODAY))).toEqual(['a', 'b', 'c']);
    expect(r.find(t => t.id === 'a')).toMatchObject({ title: 'A', description: 'd', updatedAt: NOW });
});

test('saveTicketEdits moves to the end of the target list open tickets and renumbers the source', () => {
    const done = makeTicket({ id: 'd', date: null, position: 1, status: 'completed' });
    const r = saveTicketEdits([...all, done], 'a', edits(a, { date: null }), TODAY, NOW);
    expect(ids(listOf(r, null))).toEqual(['x', 'a', 'd']);
    expect(listOf(r, TODAY).map(t => t.position)).toEqual([0, 1]);
    expect(r.find(t => t.id === 'a')!.updatedAt).toBe(NOW);
});

test('saveTicketEdits puts a completed ticket on a past day', () => {
    const r = saveTicketEdits(all, 'b', edits(b, { status: 'completed', date: '2026-11-20' }), TODAY, NOW);
    expect(r.find(t => t.id === 'b')).toMatchObject({ date: '2026-11-20', position: 0, status: 'completed' });
    expect(ids(listOf(r, TODAY))).toEqual(['a', 'c']);
});

test('saveTicketEdits snaps an open ticket with a past date to today', () => {
    const r = saveTicketEdits(all, 'x', edits(x, { date: '2026-11-20' }), TODAY, NOW);
    expect(r.find(t => t.id === 'x')).toMatchObject({ date: TODAY, position: 3 });
});

test('saveTicketEdits snaps a stale "today" draft after midnight', () => {
    const r = saveTicketEdits(all, 'a', edits(a, { title: 'A' }), '2026-11-27', NOW);
    expect(r.find(t => t.id === 'a')).toMatchObject({ date: '2026-11-27', title: 'A' });
});

test('saveTicketEdits moves a completed ticket ahead of the target day completed tickets', () => {
    const doneA = makeTicket({ id: 'p', date: '2026-11-27', position: 0, status: 'completed' });
    const doneB = makeTicket({ id: 'q', date: TODAY, position: 3, status: 'completed' });
    const r = saveTicketEdits([...all, doneA, doneB], 'q', edits(doneB, { date: '2026-11-27' }), TODAY, NOW);
    expect(ids(listOf(r, '2026-11-27'))).toEqual(['q', 'p']);
    expect(listOf(r, '2026-11-27').map(t => t.position)).toEqual([0, 1]);
});
```

- [ ] **Step 2: Run and confirm they fail**

Run: `npx vitest run src/domain/tickets.test.ts`
Expected: FAIL (`isDateAllowed` / `saveTicketEdits` not exported).

- [ ] **Step 3: Implement `isDateAllowed`, `TicketEdits` and `saveTicketEdits` in `src/domain/tickets.ts`**

Reuse `updateTicket` for the field patch and `placeList` for both lists (pass `new Set([id])` as `touched` for the target so `updatedAt` is set). Update the file's header comment: "completed tickets can't be moved" becomes "completed tickets can't be dragged; `saveTicketEdits` may move them".

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/tickets.ts src/domain/tickets.test.ts
git commit -m "feat: add saveTicketEdits with the past-date rule"
```

---

### Task 2: Focus view — date field, snap note, timestamps

**Files:**

- Modify: `src/domain/dates.ts`, `src/domain/dates.test.ts`
- Modify: `src/app/focus-view.ts`
- Modify: `src/styles.css` (near `.field` / `.field-error`, ~line 591–625)
- Modify: `docs/architecture.md` (the `FocusView` bullet under Components)

**Interfaces:**

- Consumes: `isDateAllowed`, `saveTicketEdits`, `TicketEdits` from Task 1; `TasksStore.today` (signal) and `TasksStore.change`.
- Produces: `export function formatTimestamp(iso: string): string` in `dates.ts`, which is `formatLongDate(toLocalDate(new Date(iso)))`.

- [ ] **Step 1: Write the failing test** in `dates.test.ts`

```ts
test('formatTimestamp shows an ISO timestamp as a local long date', () => {
    expect(formatTimestamp('2026-11-26T12:00:00.000Z')).toBe('Thu 26 Nov 2026');
});
```

- [ ] **Step 2: Run and confirm it fails**, then **implement `formatTimestamp`**, then run `npm test` and confirm PASS.

- [ ] **Step 3: Add the date draft and controls to `FocusView`**

- New signals: `date = signal<string | null>(null)` (loaded from `ticket().date` in the existing effect, next to the other drafts) and `dateNote = signal(false)` (reset to `false` in that effect).
- `today = this.store.today`. Computed `minDate`: `null` when `status() === 'completed'`, else `today()`.
- New `.field` block between Status and Description, labelled `Date`, containing:
    - `<input type="date">` with `[value]="date() ?? ''"`, `[attr.min]="minDate()"`, `[disabled]="date() === null"`. On `change`: if the value is `''`, reset the input to the current draft and do nothing else (Review Focus). Otherwise go through `setDate(value)`.
    - A checkbox labelled `No date (backlog)`, `[checked]="date() === null"`. Ticking sets `date` to `null`. Unticking sets it to `today()`. Both clear `dateNote`.
- `setDate(value: string)`: if `isDateAllowed(value, status(), today())`, set it and clear the note. Otherwise set `today()` and set `dateNote` to `true`.
- The status `change` handler: after setting the status, if `!isDateAllowed(date(), newStatus, today())`, set `date` to `today()` and `dateNote` to `true`.
- When `dateNote()` is true, show `<p class="field-note">Past dates are only for completed tickets</p>` under the field.
- `save()` calls `store.change(t => saveTicketEdits(t, id, { title, description, status, date }, store.today(), new Date().toISOString()))` instead of `updateTicket`. Drop the `updateTicket` import if it's unused.
- `dateLabel` stays based on `ticket().date` (the saved date).
- At the bottom, above `.dialog-actions`: `<p class="focus-meta">Created {{ created() }} · Updated {{ updated() }}</p>`, with computeds that call `formatTimestamp(ticket().createdAt / updatedAt)`.

- [ ] **Step 4: Styles in `src/styles.css`**

`.field-date` (a row: the date input plus the checkbox label, with a gap), `.field-note` (muted, small, like `.field-error` but `var(--color-text-muted)`), `.focus-meta` (muted, small). Use tokens only. Also add `color-scheme: dark` on the date input if the popup otherwise renders light.

- [ ] **Step 5: Update `docs/architecture.md`**

FocusView bullet: title, description, status **and date** are drafts until Save. The date allows past days only for completed tickets (`isDateAllowed`), and Save goes through `saveTicketEdits`. The modal shows created/updated dates.

- [ ] **Step 6: Verify**

Run: `npm test && npm run build`
Expected: tests pass, both builds succeed with no template type errors.

Then run the app (`npm start`) and check by hand:

1. Open a pending ticket on today. Past days are greyed in the picker. Typing a past date snaps it to today and shows the note.
2. Set status to Completed, pick last week, Save. The ticket appears in that day's Done list.
3. Pick a past date while Completed, then switch the status to Pending. The date snaps to today and the note shows.
4. Tick "No date (backlog)", Save. The ticket moves to the end of the backlog's open tickets. The header shows "Backlog" only after Save.
5. Clear the date input with the keyboard. The previous date stays.
6. The Created · Updated line shows, and Updated changes after a Save.

- [ ] **Step 7: Commit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts src/app/focus-view.ts src/styles.css docs/architecture.md
git commit -m "feat: set a ticket's date and show timestamps in the focus view"
```
