# Locked-card look and faster pile sort — Design

Date: 2026-11-26
Status: approved 2026-11-26 (the user reviewed screenshots of the look in the app)
Builds on: `2026-11-26-completed-tickets-design.md` (its two deferred review minors)

## Intent

A completed card looked exactly like one you can drag; only the status label differed, and dragging it did nothing. It should look done and locked at a glance. Separately, `sinkCompleted` should do one pass over the tickets per change instead of one per list.

## Decided

- **Look (the user picked B + C):** completed cards (`.is-locked`) are flat: transparent background, 1px border, muted title with a strike-through. On hover the background fills in slightly, since the card still opens on click. Keyboard focus keeps the 2px cyan ring.
    - Days: border `--color-text-muted` at half strength (the user asked for a stronger border after the review; `--color-border` was nearly invisible), hover `--color-surface-raised` (`--color-surface` would match the column background), title `--color-text-muted`.
    - Backlog: a **stronger** border than `--color-glass-border` (the user asked for this after the preview): `--color-glass-text-muted` mixed to half strength; hover `--color-glass-card`; title `--color-glass-text-muted`.
    - The status label ("Completed") and the priority number stay.
- **Sort:** `sinkCompleted` groups the tickets by list in one pass (like `renumberAll`). Behaviour unchanged; the existing tests are the guard.

## Approaches

- Look: A, a lock icon in place of the priority number (my recommendation), B, a flat card, and C, a struck-through title. The user chose B + C.
- Sort: there's only one sensible way (group once). Not worth an index structure at personal scale.

## Left to the builder

Exact CSS rule layout, within the tokens above. Update the Card row of `docs/style-guide.md`.
