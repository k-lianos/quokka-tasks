# Day view and routing — Design

Date: 2026-11-26
Status: approved 2026-11-26
Builds on: `2026-11-26-tasks-app-design.md`, `2026-11-26-completed-tickets-design.md`
Mockup chosen: option B ("Now" ticket on top), shown in the brainstorming session on 2026-11-26.

## Intent

The user wants a focused screen for one day, used both to **plan** the day (pull tickets in from the backlog, put them in order) and to **work through** it (see what to do now, finish it, move on). The week view stays for planning the week. Adding a second screen is also the moment to introduce Angular routing, so the app has a proper structure for screens.

## Goals

- A **Day view** for one calendar date, which is the screen the app opens on (today).
- On today, a highlighted **Now** ticket with its full description and one-click actions, then **Up next**, then **Done**.
- Planning in the Day view works as in the week view: drag and drop within the day and to/from the backlog, **+ add**.
- A **Day | Week** switch, and navigation by day (‹ Today ›) in the Day view.
- Angular routing with hash URLs: `#/day/:date`, `#/week/:weekStart`.

## Non-goals

- No new stored data: "Now" is derived, not saved. `DataFile` stays `version: 1`.
- No mouse back/forward buttons, keyboard shortcuts or history navigation (the frameless window has no address bar; can come later).
- No "remember last screen": the app always opens on today's Day view.
- No timers, time tracking or focus/pomodoro mode.
- No separate Plan / Work modes (option C, rejected).
- No cross-day drag in the Day view other than via the backlog (same as the week view's cross-week rule).

## Anti-goals

- The "Now" ticket disagreeing with what the user would expect from the list (see the rule below — it must be predictable).
- Statuses changing without the user pressing something.
- Drops landing in a different place than where the ticket was dropped (Day view list indexes must map correctly to stored positions).
- Losing data or breaking the existing week view behaviour (rollover, locked completed tickets, flush on close).

## Constraints

- Project rules in `CLAUDE.md`: domain logic in `src/domain/` (no Angular/DOM imports, unit-tested); all styles in `src/styles.css` using design tokens per `docs/style-guide.md`; Conventional Commits on a feature branch.
- Electron loads the UI with `loadFile` (a `file://` URL), so path-based routing would break; hash routing is required.
- New dependency: `@angular/router` (same version line as `@angular/core`, `^22.3.0`, as a devDependency). **Approved by the user on 2026-11-26.**

## Approaches

| Approach                                                                                                                                                               | Trade-off                                                                                                                                                                                   | Verdict                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Shell + routed middle**: `App` keeps the title bar, banners, backlog panel, ticket editor and drag-and-drop group; a `<router-outlet>` swaps `WeekPage` / `DayPage`. | One backlog, editor and drop handler; backlog doesn't remount when switching. The header must know which page is active; drag and drop must work across the outlet boundary (verify first). | **Chosen** by the user |
| Two full pages, each with its own header, backlog and drop group                                                                                                       | Each page self-contained; simplest routing. Header and backlog duplicated, backlog remounts on every switch.                                                                                | Rejected               |
| No router, a `view` signal in `App`                                                                                                                                    | Cheapest, but the user asked for routing, and it gives no structure for future screens.                                                                                                     | Rejected               |

Day view layout options (from the mockups): A zoomed-in day list, **B "Now" ticket on top** (chosen by the user), C separate Plan / Work modes.

## Behaviour

### Routes

| URL                       | Screen                                         |
| ------------------------- | ---------------------------------------------- |
| `#/day/:date`             | Day view for `date` (`YYYY-MM-DD`).            |
| `#/week/:weekStart`       | Week view for the week containing `weekStart`. |
| `#/` and anything unknown | Redirect to `#/day/<today>`.                   |

- An invalid `:date` (not a real `YYYY-MM-DD` date) redirects to today's Day view. _(designer's call)_
- A `:weekStart` that is a valid date but not a Monday is normalised to the Monday of its week (replace the URL). Invalid → this week. _(designer's call)_
- The app opens on today's Day view (decided by the user).

### Header (shared, in the shell)

```
Quokka   THURSDAY · WEEK 48         ▓▓▓░░ 2 of 5 done    [‹ Today ›]   [Day|Week]   – □ ×
         26 November
```

- Day view: eyebrow `<Weekday> · Week <n>`, title `<d> <Month>` (year added when not the current year — _designer's call_). Progress shows "`<completed> of <total>` done" for that day, with a bar. Hidden when the day has no tickets. _(designer's call)_
- Week view: heading as today (`formatWeekHeading`), no progress.
- **‹ ›** step one day in the Day view, one week in the Week view. **Today** goes to today's day / this week.
- **Day | Week** switch (decided):
    - Day → Week: the week containing the viewed day.
    - Week → Day: today if today is in that week, otherwise that week's Monday.
- In the Week view, clicking a day's heading opens that day's Day view.
- The header stays a window drag region with the window controls, as now.

### "Now" ticket (decided by the user)

Only on **today's** Day view. Among today's tickets, Now is:

1. the highest-priority (lowest `position`) ticket with status **In Progress**; else
2. the highest-priority ticket with status **Pending**; else
3. none: the block shows "All done for today" (or "Nothing planned for today" if the day has no tickets — _designer's call_). Adding and dropping happen in the always-visible Up next zone below (see Drag and drop).

This is a pure domain function, e.g. `nowTicket(tickets, today): Ticket | null`, unit-tested.

The Now block shows: priority number, title, status, the full description (plain text, line breaks kept; scrolls within a max height if long — _designer's call_), and buttons:

- **Start** — only when the Now ticket is Pending; sets it to In Progress.
- **Done → next** — sets it to Completed. The rule is re-evaluated, so the next ticket becomes Now.
- **Open** — opens the existing ticket editor (the current "focus view" modal). Clicking the title does the same. _(designer's call)_

Statuses never change automatically.

### Today's Day view layout

```
┌ NOW ───────────────────────────────────────┐   ┌ Backlog ┐
│ 3  Call the accountant      ● In Progress  │   │ …       │
│ Ask about the invoice from October, …      │   │         │
│ [Done → next]  [Open]                      │   │         │
└────────────────────────────────────────────┘   │         │
UP NEXT                                           │         │
 1  Email the landlord     ● Pending  [Start]     │         │
 2  Review PR #8           ● Pending  [Start]     │         │
 + add                                            │         │
DONE                                              │         │
 ✓  Fix login bug                                 └─────────┘
```

- **Up next**: every other open ticket of the day, in priority order, each with its priority number (`position + 1`), title, first line of description (truncated, muted), status, and a **Start** button for Pending tickets. Clicking a row opens the ticket editor.
- Starting a ticket from Up next does not reorder anything; it becomes Now only if rule 1 picks it (i.e. no higher-priority ticket is In Progress). Other In Progress tickets stay in Up next with their blue dot.
- **Done**: the day's completed tickets (the existing pile), dimmed, locked as today. Clicking opens the editor. Hidden when empty. _(designer's call)_
- **+ add** at the end of Up next; new tickets go to the bottom of the open tickets, as everywhere.

### Other days in the Day view (designer's calls, agreed in conversation)

- **Future days**: no Now block. The list is Up next (all open tickets, draggable, with **+ add**) and Done.
- **Past days**: read-only, as past columns are in the week view: no **+ add**, not a drop target, nothing draggable (rollover means only completed tickets remain there).

### Drag and drop in the Day view

- Up next is a drop list for the viewed date, connected to the backlog (same `cdkDropListGroup` in the shell). Reordering within Up next and moving to/from the backlog follow the existing rules (`canDropInto`, `moveTicket`, completed tickets locked).
- The Now ticket is **not** draggable and the Now block is not a drop target. _(designer's call: it is picked by status, not position, so dragging it would be confusing.)_ To change its priority, use the Week view, or change statuses.
- **Index mapping:** because the Now ticket is shown outside the list, a CDK index in Up next is not the ticket's position in the day. A pure domain function maps a drop index in "open tickets minus Now" to the `toIndex` that `moveTicket` expects, unit-tested. Without Now (future days) the mapping is the identity.
    - Rule: the dropped ticket goes **directly before the visible ticket below the drop gap**. If the gap is at the end of Up next, it goes to the end of the day's open tickets (after Now). _(builder's call: otherwise a drop at the bottom could land above Now.)_ So a gap whose neighbours straddle Now's position always lands **after** Now. _(designer's call: Now is never displaced by a pure reorder.)_
    - A drop can still change Now through the status rule: an **In Progress** ticket placed above the current Now (or any In Progress ticket dropped while Now is a Pending ticket) becomes Now, exactly as if it had been started there; the card moves into the Now block. _(decided by the user, option A: allow the jump; the alternative of refusing such drops was rejected.)_
- **Empty states:** on today and future days, Up next is always shown, even when empty, as a visible drop zone ("Drag tickets here from the backlog") with **+ add** below it. On today with no open tickets, the Now block shows the "All done / Nothing planned" message only; the hint points to the Up next zone. _(designer's call: one drop target, no special case in the Now block.)_

### Date change while open

- Day view: if the user is viewing the old today, navigate to the new today; otherwise stay. Week view: existing `nextViewedWeek` rule, now done by navigating.
- Rollover is unchanged (store-level).

### Unchanged

The ticket editor modal (still named `FocusView` in code), confirm dialog, banners, save/flush-on-close, rollover, completed-ticket locking, storage format.

## The how (decided)

- `@angular/router` added; `provideRouter(routes, withHashLocation(), withComponentInputBinding())` in `app.config.ts`.
- `App` becomes the shell: header, banners, `cdkDropListGroup` wrapping the outlet and the backlog panel, the ticket editor. `WeekPage` holds the seven columns; `DayPage` holds Now / Up next / Done. Drop handling and "open ticket" stay in the shell (or a small service) so both pages share them.
- New domain functions in `src/domain/` with Vitest tests: `nowTicket`, the Day view drop-index mapping, date-param validation, and any header formatting (`formatDayHeading`, progress counts).
- Styles in `src/styles.css` with existing tokens; the Now block uses the accent tint and border as in the mockup.

## Left to the builder

- First implementation step: prove a drag from the shell's backlog into a list inside the routed page works (and back). If CDK's drop-list group does not reach across the router outlet, fall back to connecting lists explicitly (`cdkDropListConnectedTo` via a shared registry) and note it.
- How the shell header learns the active route (router events / `ActivatedRoute` of the child / a small view-state service).
- Component names and file layout beyond the above; whether Up next reuses `TicketList` / `TicketCard` with a "detailed" variant or a new row component.
- Exact styling within the style guide.
- Updating `CLAUDE.md` / the main design doc's non-goals list where they now differ (e.g. the app now has more than one screen).
