# Quokka Tasks — style guide

The reference for anyone adding or changing UI. If a new feature looks like it belongs here, it follows this guide. The design decisions behind it are in `docs/superpowers/specs/2026-11-26-visual-style-design.md`.

## Intent

Dark, confident, a little bit showy. It should be an app you're proud to show people. Near-black navy backgrounds, white text, **one electric cyan** used sparingly so it always means something, and a deep royal-blue "glass" panel for the backlog. Big soft corners, heavy geometric type for headlines.

Origin: a brand mood board (navy, cyan, royal-blue glass, rounded tiles, chunky geometric mark). We took the palette and feel, not anyone's brand.

```
 [Q] Quokka │ WEEK 48 · 2026                       ( ‹  Today  › )
            │ 23 – 29 November
 ┌Mon┐┌Tue┐┌Wed┐┏━Thu━┓┌Fri┐┌Sat┐┌Sun┐ ╔═Backlog═══╗
 │ ▪ ││ ▪ ││ ▪ │┃ ▪   ┃│ ▪ ││   ││   │ ║ ▪ (glass)  ║
 └───┘└───┘└───┘┗━━━━━┛└───┘└───┘└───┘ ╚════════════╝
  past (dimmed)  today: cyan outline     royal-blue gradient
```

## Rules for new UI

1. **Styles live only in `src/styles.css`.** No component `styles`, no inline `style=""`.
2. **Use tokens only.** Rules reference `var(--…)`. A raw colour value belongs in the `:root` block and nowhere else. Need a new colour? Add a token, document it here.
3. **Cyan is precious.** Use `--color-accent` only for: the brand mark, today, the primary action in a group (one per group), focus rings, the "in progress" status, and drag targets. Not for large backgrounds, body text, or decoration.
4. **Contrast: WCAG AA.** Text ≥ 4.5:1 against what it sits on (≥ 3:1 for large text and UI shapes). Check muted text especially; on the glass panel use `--color-glass-text-muted`.
5. **Focus is always visible.** Interactive elements get the global `:focus-visible` ring (`--focus-ring`). Don't remove it; if you override `box-shadow` on a focusable element, re-add the ring for `:focus-visible`. Inside a scroll container (like `.cards`) the outer ring gets clipped, so use an inset ring there (`.card:focus-visible`).
6. **Icons are inline SVG** with `stroke`/`fill="currentColor"`, `aria-hidden="true"`, class `icon` (16px), and the button carries the `aria-label`. No icon fonts, no emoji/unicode glyphs as icons.
7. **Dark native controls.** `:root` sets `color-scheme: dark`, so selects, scrollbars and other native controls render dark. Keep it.
8. **Nothing remote.** Fonts and images are bundled (CSP is `default-src 'self'`).
9. **Shape and space from the scales** below; don't invent in-between values.
10. **Check 900px.** The window's minimum width is 900px; there is a compact media query at the end of `styles.css` (≤ 1200px). New layouts must not overflow there.

## Tokens

`src/styles.css` `:root` is the source of truth; this table mirrors it.

### Colour

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#070b12` | app background (also Electron `backgroundColor` in `electron/main.ts`; keep in sync) |
| `--color-surface` | `#0d131d` | day columns, dialogs |
| `--color-surface-raised` | `#131b28` | cards, inputs, buttons, the header pill |
| `--color-border` | `#1c2636` | hairlines, dividers, dialog edge |
| `--color-accent` | `#00e1f0` | electric cyan (see rule 3) |
| `--color-on-accent` | `#04121a` | text/icons on cyan |
| `--color-accent-tint` | cyan at 8% | hover backgrounds, drop placeholder fill |
| `--color-glass-from` / `--color-glass-to` | `#0f2a8a` / `#0a1a55` | backlog gradient (160°) |
| `--color-glass-border` | `#2d5cff66` | backlog inner edge |
| `--color-glass-card` | white at 7% | cards on the glass panel |
| `--color-glass-text-muted` | `#b4c0d6` | muted text on the glass panel |
| `--color-text` | `#f2f6fa` | primary text |
| `--color-text-muted` | `#8a97a8` | headings, meta, status labels |
| `--color-success` | `#3ddc97` | completed |
| `--color-danger` | `#ff6b6b` | delete, errors |
| `--color-warning` | `#ffc857` | notices |
| `--color-backdrop` | near-black at 70% | dialog backdrop |

Checked contrast (AA): muted on surface 6.3, muted on raised 5.8, danger on surface 6.7, on-accent on accent 11.8, text on glass ≥ 11, glass-muted on glass card 5.6.

### Shape, space, type, effects

| Group | Tokens |
|---|---|
| Radius | `--radius-sm` 9px (buttons, inputs) · `--radius-md` 11px (cards, banners) · `--radius-pill-outer` 12px (header pill) · `--radius-lg` 16px (columns) · `--radius-xl` 22px (dialogs) |
| Space | `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 (px) |
| Font | `--font-sans`: Plus Jakarta Sans Variable (bundled via `@fontsource-variable/plus-jakarta-sans`), fallback `system-ui` |
| Size | `--font-size-small` 12px · `--font-size-body` 14px · `--font-size-display` 26px |
| Weight | `--font-weight-heavy` 800 for display, brand, column headings; 600 for buttons; 400 body |
| Tracking | `--tracking-tight` -0.03em (display, brand) · `--tracking-caps` 0.08em (uppercase labels) |
| Effects | `--shadow-lift` (dialogs, drag preview) · `--focus-ring` (2px bg gap + 2px cyan, visible on cyan too) · `--transition-fast` 120ms |

### Type scale

| Role | Style |
|---|---|
| Display (week range) | 26px / 800 / tight |
| Brand word | 22px / 800 / tight |
| Eyebrow (week number) | 11px / 800 / caps / cyan |
| Column heading | 12px / 800 / caps / muted |
| Field label | 12px / 800 / muted (not uppercase) |
| Body, card title, inputs | 14px / 400 |
| Meta (status) | 12px / muted · priority number 12px / 800 / muted |

## Components

| Component | Classes | Notes |
|---|---|---|
| Header | `.week-header`, `.brand`, `.brand-mark`, `.brand-word`, `.week-title`, `.week-eyebrow`, `.week-range` | No bar. Lockup, divider, two-line week, pill on the right. |
| Segmented pill | `.pill`, `.pill-button`, `.pill-button.is-primary` | Raised-surface track; one primary (cyan) button max. |
| Day column | `.list`, `.list-heading`, `.list.is-today`, `.list.is-past` | Surface panel. Today = 2px inset cyan outline + cyan heading. Past = hollow (transparent with a 1px border), cards on `--color-surface`, titles muted. Never dim with `opacity`: it breaks AA contrast. |
| Backlog (glass) | `.backlog .list` | Royal-blue gradient + blue inner edge; cards translucent white; muted text uses `--color-glass-text-muted`. |
| Card | `.card`, `.card-priority`, `.card-title`, `.card-status`, `.status-dot` | Raised surface, one-line title with ellipsis. Dot: muted = to do, cyan = in progress, green = done. |
| Add | `.add-button`, `.add-input` | Quiet muted text, cyan on hover; input styled like fields. |
| Buttons | `.button`, `.button-danger`, `.icon-button` | Quiet raised button; danger = red text on 15% red; icon button = 30px square, transparent. |
| Fields | `.field`, `.field input/select/textarea`, `.field-error` | Label above, small heavy muted; borderless raised inputs; focus ring on focus. |
| Dialog | `.dialog-backdrop`, `.dialog`, `.dialog-actions` | Surface panel, `--radius-xl`, 1px border ring + lift shadow, dark backdrop. |
| Banner | `.banner`, `.banner-error` | Raised surface with a 4px left stripe: warning (notice) or danger (error). |
| Drag and drop | `.card-placeholder`, `.cdk-drag-preview` | Placeholder: 2px dashed cyan on cyan tint. Preview: lift shadow. |
| Icon | `.icon` | 16px inline SVG, `currentColor`, stroke 2.5, round caps. |

## Brand mark and app icon

- The **Q mark** is an inline SVG path (viewBox `0 0 32 32`) in `src/app/week-header.ts`; cyan via `currentColor`.
- The **app icon** source is `assets-src/icon.svg` (cyan Q on a navy rounded square). Exported files: `public/icon.png` (512px; Electron window and `.deb`) and `public/favicon.ico`. Re-export commands are in the SVG's comment (Inkscape + ImageMagick).

## Adding a component: checklist

- [ ] Markup uses existing classes where one fits; new classes are named for what the thing is (`.thing`, `.thing-part`, `.thing.is-state`).
- [ ] CSS added to `src/styles.css` in its own commented section; only tokens.
- [ ] Cyan only for one of the allowed uses (rule 3).
- [ ] Text contrast checked (rule 4); hover and `:focus-visible` states present.
- [ ] Icons are inline SVG with an `aria-label` on the button.
- [ ] Looks right at 1400×800 and at 900px wide.
- [ ] New tokens or components added to the tables above.
