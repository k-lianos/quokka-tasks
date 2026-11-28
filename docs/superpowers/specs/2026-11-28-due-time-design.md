# Due time (design)

Stage 3 of enriching the ticket modal. Earlier stages: date picker and timestamps (PR #21); priority, estimate and link with the first migration (PR #22). Reminders and notifications were dropped from this stage: the user wants only the time.

## Intent

A ticket can have a **due time**: a time of day on its date (e.g. 14:00). It's shown on cards and Day rows, so timed things stand out at a glance. Nothing fires and nothing re-orders: list order is still the drag order.

## Goals, non-goals, anti-goals

- **Goals:**
    - An optional time field in the focus view, a draft applied on Save like the others.
    - The time shown as `14:00` on week cards, Day rows and the Now block.
- **Non-goals:**
    - Notifications or reminders, and keeping the app running in the background.
    - Sorting by time.
    - Highlighting passed times (option C, possible later).
    - Times on backlog tickets.
- **Anti-goals:**
    - Losing data in the 2 → 3 migration.
    - A time without a day (a backlog ticket with a stale time).

## Approaches

- **Native `<input type="time">`, stored as `"HH:MM"` text. Picked.**
- Rejected:
    - **Minutes since midnight:** less readable on disk, and it needs conversion everywhere.
    - **A full timestamp:** duplicates `date`, and the two can disagree after rollover.
    - **A custom picker:** more code. It can replace the native input later.

## Decisions

- **Data:** `Ticket.dueTime: string | null`, either 24-hour `"HH:MM"` (`/^([01]\d|2[0-3]):[0-5]\d$/`) or `null`. `DataFile.version` becomes `3`.
- **Migration 2 → 3:** sets `dueTime: null` on every ticket and changes nothing else. Fixtures follow the convention in `docs/architecture.md`:
    - a hand-written `src/domain/fixtures/tasks.v2.json` with its `tasks.v2.migrated.json`;
    - the version-1 fixture's chain test now ends at version 3;
    - `tasks.v1.migrated.json` stays the frozen 1 → 2 result, so the 1 → 2 step test compares one step, not the whole chain.
- **Backlog:**
    - A ticket with `date === null` always has `dueTime === null`, enforced in the domain (`saveTicketEdits`) as well as in the UI.
    - Ticking "No date (backlog)" clears and disables the time input. Unticking leaves it empty.
    - A drag from a day into the backlog (`moveTicket`) also clears the time _(designer's call: no stale time without a day)_.
- **Rollover and date changes:** the time is kept as it is.
- **Modal:**
    - A `Time` field on the Date row, after the date input and before the backlog checkbox. It's a native time input, and clearing it means no time.
    - Stored as the input's value (`"HH:MM"`, 24-hour). The input itself shows the system locale's format (e.g. `02:00 PM`).
- **Display:**
    - `14:00` (24-hour, always). Small and muted, next to the status on `TicketCard`, `DayRow` and `NowBlock`. Only when set.
    - No raw colours: existing muted text token only.
- **Docs:** update the data model, the shipped migrations list and the FocusView/component notes in `docs/architecture.md`.

## Left to the builder

- Exact placement and spacing of the time in each card layout, within the style guide and at the 900px minimum width.
