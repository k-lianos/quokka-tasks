# Focus view: date picker and timestamps (design)

Stage 1 of enriching the ticket modal (`FocusView`). Later stages, each with its own design: (2) estimate, link and priority label, with data version 2 and the first migration; (3) due time and reminders; (4) comments; (5) attachments. Dropped: assignee, watchers, tags, subtasks.

## Intent

Today a ticket's day can only be changed by dragging. The user wants to set "the day I'll work on it" from the modal, including **past days, to log work already finished**. The modal also shows when the ticket was created and last updated.

## Goals

- A date field in the focus view that sets `ticket.date`, or `null` (backlog).
- Past dates are allowed only when the (draft) status is Completed.
- A read-only "Created … · Updated …" line.

## Non-goals

- No change to the stored data shape (`date`, `createdAt` and `updatedAt` already exist), so no version bump or migration.
- No custom calendar widget, and no quick-pick buttons (Today/Tomorrow).
- No change to drag-and-drop rules: drops into past days stay refused.

## Anti-goals

- An open ticket ending up on a past day. That would break the rollover rule, or make the picker look broken when rollover moves the ticket straight back.

## Approaches

- **A. Native `<input type="date">` + "No date (backlog)" checkbox. Picked.** Built into Chromium, offline, no dependency. Only the popup can't be styled with our tokens.
- B. Custom Angular month grid: fully on-style, but ~150–200 more lines plus keyboard and accessibility work. It can replace A in a later visual pass, because the rules live in the domain.
- C. Quick buttons + native input: more to design, and the buttons don't help with logging past work.

## Behaviour

- The date is a draft like title, description and status: it applies only on **Save**. Closing without saving discards it.
- The input's `min` is today unless the draft status is Completed. The "No date (backlog)" checkbox clears and disables the input. Unticking it fills in today.
- If the draft date is in the past and the draft status changes away from Completed, the draft date snaps to today and a short note under the field says why ("Past dates are only for completed tickets").
- On Save with a **different** date, the ticket goes to the end of the new list's open tickets. The completed sink then places completed tickets in the Done pile. With the **same** date, the position doesn't change.
- The header line (`dateLabel`) keeps showing the saved date, not the draft.
- Timestamps: a quiet line at the bottom, e.g. "Created 26 Nov 2026 · Updated 28 Nov 2026", using the existing date formatting.

## How it's built

- **Domain** (`src/domain/tickets.ts`, with tests): a pure function that applies the modal's whole patch (title, description, status, date) in one step and does the re-placement above. `moveTicket` refuses completed tickets, so it can't be used as is. The function also enforces the past-date rule (an open ticket with a past date goes to today), so the rule doesn't depend on the UI. The rule "past is allowed only for completed" is a small pure helper the UI reuses for `min` and the snap.
- **UI** (`src/app/focus-view.ts`): a `date` draft signal (`string | null`), the input + checkbox, the note, and the timestamps line. Styles go in `src/styles.css` with tokens only (`docs/style-guide.md`).
- **Docs**: update the `FocusView` entry in `docs/architecture.md`.

## Left to the builder

- Exact names of the new domain function and helper.
- Exact layout and wording of the date row and the timestamps line, within the style guide.
- Date format of the timestamps (reuse an existing formatter from `domain/dates.ts`).
