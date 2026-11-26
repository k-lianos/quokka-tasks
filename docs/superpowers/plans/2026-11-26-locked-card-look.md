# Locked-Card Look and Faster Pile Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Completed cards look flat and struck through; `sinkCompleted` does one grouping pass.
**Spec:** `docs/superpowers/specs/2026-11-26-locked-card-look-design.md`

## Global Constraints
- Tokens only in `src/styles.css` (`color-mix` of tokens is allowed, as elsewhere in the file); no raw colours.
- Domain functions return the same array when nothing changes.

## Review Focus
1. Keyboard focus on a locked card must still show the cyan ring (the border also uses `box-shadow`).
2. Past days (hollow column, `.list.is-past .card` rules) must not override the locked look.

### Task 1: `sinkCompleted` single pass
**Files:** `src/domain/tickets.ts`
- [ ] Refactor `sinkCompleted` to build a `Map<string | null, Ticket[]>` in one pass (as `renumberAll` does), then sort and `placeList` each group. Same signature.
- [ ] Run `npm test`. Expected: 42/42 pass (the 9 completed-ticket tests guard the behaviour).
- [ ] Commit `refactor: group tickets once when sinking completed ones`.

### Task 2: Locked-card look
**Files:** `src/styles.css` (after the `.card` rules), `docs/style-guide.md` (Card row)
- [ ] Add the `.is-locked .card` rules from the spec, plus `.is-locked .card:focus-visible` (2px accent inset ring), and the `.backlog .is-locked` variants. Make the selectors at least as specific as `.list.is-past .card` / `.list.is-past .card-title`.
- [ ] `npm test && npm run build`. Expected: pass.
- [ ] Screenshot the app over CDP with scratch data (a past day, today, a future day and the backlog, each with completed cards; one locked card focused). Expected: the look matches the approved preview, the backlog border is clearly visible, and the focus ring shows.
- [ ] Update the style guide's Card row, then commit `feat: give locked completed cards a flat, struck-through look`.
