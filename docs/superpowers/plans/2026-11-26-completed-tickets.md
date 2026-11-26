# Completed Tickets Locked and Piled Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completed tickets can't be dragged and always sit at the bottom of their list (day or backlog), while staying editable.

**Architecture:** A new pure invariant `sinkCompleted` in `src/domain/tickets.ts` (open tickets first, completed after, each group in its current order) runs after rollover on every store change and on load. Because it is a stable sort on (completed?, position), a ticket that just became completed lands at the top of the pile automatically, and an un-completed one becomes the last open ticket — no special status-change code. `moveTicket` refuses completed tickets and clamps the index above the pile; the UI disables drag on completed cards and stops the drag placeholder from entering the pile.

**Tech Stack:** TypeScript, Angular 22 (signals, standalone), `@angular/cdk/drag-drop`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-26-completed-tickets-design.md`

## Global Constraints

- `src/domain/` imports nothing from Angular, Electron, Node or the DOM.
- Domain functions never mutate input and return the **same array** when nothing changes (the store relies on `next === before` to skip saving).
- No new dependencies. All styles in `src/styles.css`, design tokens only.
- Conventional Commits; branch `feat/completed-tickets`.
- Verification: `npm test && npm run build`.

## Review Focus

1. **A new ticket added to a day that has completed tickets** — `createTicket` appends at the bottom; after `sinkCompleted` it must sit above the pile, not below. (Test in Task 1.)
2. **Dropping into a list where every ticket is completed** — lands at index 0. (Test in Task 1.)
3. **Old data with mixed lists** — load reorders once and saves; a second load changes nothing. (Store change in Task 2; idempotence test in Task 1.)
4. **Rollover into a today that has completed tickets** — rolled tickets go to the top, completed stay at the bottom. (Test in Task 1.)
5. **Clicking a completed (drag-disabled) card** still opens the focus view. (Manual check in Task 2.)

---

### Task 1: Domain — `sinkCompleted` and a locked, clamped `moveTicket`

**Files:**
- Modify: `src/domain/tickets.ts`
- Test: `src/domain/tickets.test.ts`

**Interfaces:**
- Produces: `export function sinkCompleted(tickets: Ticket[]): Ticket[]` — per list, stable order: non-completed by position, then completed by position; renumbers via the existing private `placeList`; returns the input array when already ordered. Does not touch `updatedAt` (pass an empty `touched` set, like `renumberAll`).
- Produces: `moveTicket` (same signature) now returns `tickets` unchanged when the ticket is completed, and clamps `toIndex` to the number of non-completed tickets in the target list (excluding the moving ticket).

- [ ] **Step 1: Write the failing tests** in `src/domain/tickets.test.ts` (import `sinkCompleted`, and `rollover` from `./rollover`):

```ts
const D = '2026-11-26';
const done = (id: string, position: number) => makeTicket({ id, date: D, position, status: 'completed' });
const open = (id: string, position: number) => makeTicket({ id, date: D, position });

test('sinkCompleted moves completed tickets below open ones, keeping each group in order', () => {
  const r = sinkCompleted([done('d1', 0), open('o1', 1), done('d2', 2), open('o2', 3)]);
  expect(listOf(r, D).map((t) => [t.id, t.position])).toEqual([['o1', 0], ['o2', 1], ['d1', 2], ['d2', 3]]);
});

test('sinkCompleted returns the same array when already ordered (idempotent)', () => {
  const ordered = [open('o1', 0), done('d1', 1)];
  expect(sinkCompleted(ordered)).toBe(ordered);
  const once = sinkCompleted([done('d1', 0), open('o1', 1)]);
  expect(sinkCompleted(once)).toBe(once);
});

test('a ticket marked completed goes to the top of the pile', () => {
  const list = [open('o1', 0), open('o2', 1), done('d1', 2)];
  const r = sinkCompleted(updateTicket(list, 'o1', { status: 'completed' }, NOW));
  expect(ids(listOf(r, D))).toEqual(['o2', 'o1', 'd1']);
});

test('a ticket set back from completed becomes the last open ticket', () => {
  const list = [open('o1', 0), done('d1', 1), done('d2', 2)];
  const r = sinkCompleted(updateTicket(list, 'd2', { status: 'pending' }, NOW));
  expect(ids(listOf(r, D))).toEqual(['o1', 'd2', 'd1']);
});

test('a new ticket in a day with completed tickets lands above the pile', () => {
  const r = sinkCompleted(createTicket([open('o1', 0), done('d1', 1)], { id: 'n', title: 'N', date: D, now: NOW }));
  expect(ids(listOf(r, D))).toEqual(['o1', 'n', 'd1']);
});

test('moveTicket refuses to move a completed ticket', () => {
  const list = [open('o1', 0), done('d1', 1)];
  expect(moveTicket(list, 'd1', null, 0, NOW)).toBe(list);
  expect(moveTicket(list, 'd1', D, 0, NOW)).toBe(list);
});

test('moveTicket clamps a drop below the pile to just above it', () => {
  const list = [open('o1', 0), done('d1', 1), done('d2', 2), makeTicket({ id: 'x', date: null, position: 0 })];
  expect(ids(listOf(moveTicket(list, 'x', D, 3, NOW), D))).toEqual(['o1', 'x', 'd1', 'd2']);
  expect(ids(listOf(moveTicket(list, 'o1', D, 2, NOW), D))).toEqual(['o1', 'd1', 'd2']);
});

test('moveTicket into an all-completed list lands at the top', () => {
  const list = [done('d1', 0), makeTicket({ id: 'x', date: null, position: 0 })];
  expect(ids(listOf(moveTicket(list, 'x', D, 1, NOW), D))).toEqual(['x', 'd1']);
});

test('rollover into a day with completed tickets keeps the pile at the bottom', () => {
  const list = [done('d1', 0), makeTicket({ id: 'late', date: '2026-11-25', position: 0 })];
  const r = sinkCompleted(rollover(list, D, NOW));
  expect(ids(listOf(r, D))).toEqual(['late', 'd1']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/tickets.test.ts`
Expected: FAIL — `sinkCompleted` is not exported; the moveTicket lock/clamp tests fail.

- [ ] **Step 3: Implement** `sinkCompleted` (group by `date` like `renumberAll`, sort each list by `(status === 'completed' ? 1 : 0, position)`, `placeList` with an empty `touched` set) and the two `moveTicket` changes in `src/domain/tickets.ts`. Update the file's header comment to state the invariant.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests PASS (existing ones unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/domain/tickets.ts src/domain/tickets.test.ts
git commit -m "feat: keep completed tickets at the bottom and lock them in place"
```

### Task 2: Store and UI — apply the invariant, disable drag on completed cards

**Files:**
- Modify: `src/app/tasks.store.ts` (`init`, `change`)
- Modify: `src/app/ticket-list.ts`

**Interfaces:**
- Consumes: `sinkCompleted(tickets: Ticket[]): Ticket[]` and the locked/clamped `moveTicket` from Task 1.

- [ ] **Step 1: Store.** In `init`, `const rolled = sinkCompleted(rollover(loaded, …))` (the existing `rolled !== loaded` check then saves the one-time reorder of old data). In `change`, `const next = sinkCompleted(rollover(fn(before), …))`. Update the class comment: "Every change enforces rollover and the completed-at-bottom order and saves the whole file."

- [ ] **Step 2: Disable drag.** On the `app-ticket-card` in `ticket-list.ts`, add `[cdkDragDisabled]="t.status === 'completed'"`. The card stays a `<button>`, so click still opens the focus view.

- [ ] **Step 3: Keep the placeholder out of the pile.** Add `[cdkDropListSortPredicate]="sortAbovePile"` to the drop list, with:

```ts
/** The drag placeholder may not go below the last open ticket. */
protected readonly sortAbovePile = (index: number, drag: CdkDrag): boolean => {
  const list = this.tickets();
  const openCount = list.filter((t) => t.status !== 'completed').length;
  const fromHere = list.some((t) => t.id === drag.data);
  return index <= openCount - (fromHere ? 1 : 0);
};
```

No CSS change: cards already show only the normal pointer cursor (never a grab cursor), and they still need it because completed cards open on click.

- [ ] **Step 4: Verify build and tests**

Run: `npm test && npm run build`
Expected: tests PASS, build succeeds with no template/type errors.

- [ ] **Step 5: Manual check in the app** (`npm start`, or the CDP recipe): mark a ticket completed → it drops to the top of the day's pile; a completed card can't be dragged but opens on click; set it back to Pending → it can be dragged again; dragging an open card over the pile stops the placeholder above it; adding a ticket to a day with completed ones puts it above them.

- [ ] **Step 6: Commit**

```bash
git add src/app/tasks.store.ts src/app/ticket-list.ts
git commit -m "feat: lock completed cards and keep drops above the completed pile"
```

### Task 3: Docs

**Files:**
- Modify: `docs/superpowers/specs/2026-11-26-tasks-app-design.md` — **Cards**: completed cards sit at the bottom of their list and can't be dragged; **Drag and drop**: add "Completed tickets can't be dragged; set the status back first. Open tickets dropped at or below the completed pile land just above it."; **Rollover**: "Completed tickets stay on their original day" → add "and at the bottom of it". Add one line under the title: "Completed-ticket behaviour: see `2026-11-26-completed-tickets-design.md`."
- Modify: `README.md` intro paragraph — add: "Completed tickets stay on their day, sink to the bottom, and are locked until you change their status."
- Modify: `docs/style-guide.md` Card row — append: "Completed cards are drag-disabled (`cdk-drag-disabled`) but keep the pointer cursor; they still open on click."

- [ ] **Step 1: Make the three edits above.**
- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-11-26-tasks-app-design.md README.md docs/style-guide.md
git commit -m "docs: document locked, bottom-piled completed tickets"
```
