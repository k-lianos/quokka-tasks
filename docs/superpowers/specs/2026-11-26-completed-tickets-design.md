# Completed tickets: locked in place, piled at the bottom — Design

Date: 2026-11-26
Status: approved 2026-11-26
Builds on: `2026-11-26-tasks-app-design.md`

## Intent

A completed ticket is a record of work done on that day, so it should stay put and get out of the way of open work. It stays fully editable, so a mistake can be undone: set it back to Pending / In Progress and it can be dragged again.

## Behaviour

- **Locked.** A ticket with status Completed cannot be dragged — not within its list, not to another day, not to/from the backlog. It stays in the list it is in (the day it sits on, or the backlog). Marking a ticket complete never changes its date.
- **Still editable.** Clicking a completed card opens the focus view as usual: title, description and status can be changed; it can be deleted.
- **Piles at the bottom.** Invariant: in every list (each day and the backlog), all non-completed tickets come before all completed ones. Priority numbers (`position + 1`) follow this order.
- **Marking complete** moves the ticket to the top of its list's completed pile (directly below the last open ticket). So the pile reads newest-completed first.
- **Un-completing** keeps the ticket's position: it is now the last open ticket, just above the pile, and draggable again.
- **Dropping** an open ticket anywhere at or below the pile places it directly above the pile. Open tickets can still be reordered freely among themselves.
- **Existing data:** on load, any list where completed tickets are mixed in is reordered once (open tickets in their current order, then completed in their current order) and saved.
- **Visual cue:** completed cards don't look grabbable (no grab cursor; whatever the style guide allows, using existing tokens).
- Rollover is unchanged: it already leaves completed tickets on past days.

## Goals / non-goals

- Goal: completed tickets can't be moved by accident, and open work stays at the top of every list.
- Non-goal: moving a completed ticket to the day it was actually completed (option B — rejected by the user; the board is the plan).
- Non-goal: a separate "Done" section, collapsing or hiding completed tickets.
- Anti-goal: saved positions or card priority numbers disagreeing with what's on screen.

## Approaches

| Approach | Trade-off | Verdict |
|---|---|---|
| **Domain invariant** (like rollover): a pure normaliser in `src/domain/` applied on every change and on load; `moveTicket` refuses completed tickets and clamps the drop index above the pile; cards get `cdkDragDisabled` when completed. | Small, unit-tested, positions always match the screen. | **Chosen** by the user |
| Display-only sort | Less code, but priority numbers and CDK drop indexes no longer match stored positions → misplaced drops. | Rejected |
| Separate "Done" drop list per column | Clear, but a second list per column with its own layout; more than "pile at the bottom" needs. | Rejected |

## The how (decided)

- `src/domain/`: a normaliser that orders each list open-first (stable), with the "just completed → top of pile" placement handled in the status update path; `moveTicket` returns the input unchanged for a completed ticket and clamps `toIndex` to the number of open tickets in the target list. Unit tests for all of it.
- `TasksStore.change` and `init` apply the normaliser alongside rollover (save once if load changed anything).
- `TicketList`: `[cdkDragDisabled]` for completed tickets; a CSS class for the non-grabbable look in `src/styles.css`.
- Docs: update `2026-11-26-tasks-app-design.md` (Cards, Drag and drop, Rollover note) and the README summary line; add the completed-card cue to `docs/style-guide.md` if a style is added.

## Left to the builder

Function names and exactly where the normaliser lives; whether the "top of pile on completion" step is part of `updateTicket` or a separate step in the store.
