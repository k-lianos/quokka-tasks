# Visual style — design

Date: 2026-11-26
Status: approved direction, pending doc review

## Intent

v1 shipped deliberately plain (see `2026-11-26-tasks-app-design.md`, "visual polish comes in a later iteration"). This is that iteration. The user wants Quokka Tasks to look like something they're **proud to show people**, styled after a mood board (a brand board for "Replix AI": near-black navy, electric cyan, white, deep royal-blue glass, big rounded tiles, a chunky geometric logomark and heavy geometric wordmark).

The style must also be **written down in `docs/`** as a reference, so future features follow it without anyone needing the mood board image.

## Goals

- Dark navy app with electric cyan accent and a royal-blue "glass" backlog, as picked in mockups (direction C + header 2, below).
- A brand: a geometric "Q" mark + heavy "Quokka" wordmark in the header.
- One set of design tokens (CSS custom properties) every rule uses; no stray hex values in rules.
- A durable style guide, `docs/style-guide.md`, describing tokens, components and rules for new UI, linked from `CLAUDE.md`.

## Non-goals

- Light theme, theme switching, user-configurable colours.
- Changing behaviour, layout structure (7 days + backlog), or data.
- Animations beyond the existing drag transitions and simple hover/focus transitions.
- Per-ticket colours or tags (still out of scope per the v1 spec).

## Anti-goals

- Copying the Replix AI brand itself (their R mark, name, photos). We take the palette and feel, not the identity.
- Losing readability: text on every surface must meet WCAG AA contrast (4.5:1 body, 3:1 large text / UI).
- Losing the drag-and-drop or keyboard affordances (focus must stay visible — cyan focus ring).
- Loading anything remote (the CSP and offline rule stand).

## Constraints

- All styles in `src/styles.css` (CLAUDE.md). Templates change only for structure/classes/icons.
- CSP: `default-src 'self'`; fonts and images must be bundled.
- New dependency (approved): `@fontsource-variable/plus-jakarta-sans` (OFL-1.1) as a devDependency, imported from `src/styles.css`.
- Domain logic (e.g. new label formatting) goes in `src/domain/` with Vitest tests, no Angular/DOM imports.

## Approaches

1. **Token-based rewrite of `src/styles.css` + small template tweaks** — chosen. Fits the existing "all styles in one file" rule, no framework, tokens make future features consistent and the style guide can point at them.
2. Angular Material with a custom theme — rejected: large dependency, Material look fights the mood board, contradicts the plain-CSS structure.
3. Tailwind — rejected: new build dependency, scatters styling into templates, breaks the single-stylesheet rule.

## Design (decided with the user)

Mockups: `.superpowers/brainstorm/*/content/cyan-direction.html` (option C) and `header-options.html` (option 2). Not committed; this doc is the source of truth.

```
 [Q] Quokka │ WEEK 48 · 2026                       ( ‹  Today  › )
            │ 23 – 29 November
 ┌Mon┐┌Tue┐┌Wed┐┏━Thu━┓┌Fri┐┌Sat┐┌Sun┐ ╔═Backlog═══╗
 │ ▪ ││ ▪ ││ ▪ │┃ ▪   ┃│ ▪ ││   ││   │ ║ ▪ (glass)  ║
 └───┘└───┘└───┘┗━━━━━┛└───┘└───┘└───┘ ╚════════════╝
  past (dimmed)  today: cyan outline     royal-blue gradient
```

### Palette (tokens; starting values, builder may tune for contrast)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#070b12` | app background, Electron window `backgroundColor` |
| `--color-surface` | `#0d131d` | day columns, dialogs |
| `--color-surface-raised` | `#131b28` | cards, inputs, pill controls |
| `--color-border` | `#1c2636` | hairlines, dividers |
| `--color-accent` | `#00e1f0` | electric cyan: mark, today outline, primary button, focus ring, in-progress |
| `--color-on-accent` | `#04121a` | text/icons on cyan |
| `--color-glass-from` / `--color-glass-to` | `#0f2a8a` / `#0a1a55` | backlog gradient, with `#2d5cff66` inner border |
| `--color-text` | `#f2f6fa` | primary text |
| `--color-text-muted` | `#8a97a8` | headings, meta, status labels |
| `--color-success` | `#3ddc97` | completed dot |
| `--color-danger` | red tuned for dark bg (e.g. `#ff6b6b`) | delete, errors |
| `--color-warning` | amber for the notice banner | notice banner |

Plus radius tokens (≈ 9 / 11 / 16 / 22px), a spacing scale, and font tokens.

### Typography

Plus Jakarta Sans (variable), bundled via Fontsource. Wordmark and big week date: weight 800, tight letter-spacing (≈ -0.03em). Column headings: small, uppercase, letter-spaced, muted. Body 14px.

### Components

- **Header (option 2):** no bar. Left: lockup — cyan Q mark (inline SVG) + white "Quokka" wordmark. Divider. Week block: cyan uppercase eyebrow `Week 48 · 2026` over big bold range `23 – 29 November`. Right: one segmented pill `‹ Today ›`, Today in cyan.
- **Day columns:** surface panels, ≈16px radius. Heading uppercase muted. Today: 2px cyan inner outline, cyan heading. Past: dimmed (opacity ≈ 0.5), as now.
- **Backlog:** royal-blue gradient "glass" panel with subtle blue inner border; cards on it are translucent white (≈ 7%).
- **Cards:** raised surface, ≈11px radius; priority number muted bold; status dot grey (to do) / cyan (in progress) / green (done). Hover lightens slightly.
- **Add:** muted "+ add" text button, cyan on hover; input styled as raised field with cyan focus ring.
- **Dialogs (focus view, confirm):** surface panel, large radius, dark translucent backdrop; inputs/select/textarea as raised fields; Delete is a danger-tinted button; Cancel/close are quiet buttons.
- **Banners:** notice amber-tinted, error danger-tinted, both dark-surface-friendly.
- **Drag and drop:** placeholder is a dashed cyan outline on a faint cyan tint; drag preview gets a deep shadow.
- **Focus:** every interactive element shows a cyan `:focus-visible` ring.
- **Icons:** replace ◀ ▶ ✕ glyphs with small inline SVG chevrons/close, `currentColor`.

### Header label (domain change)

The header needs the week split into two strings. Add a function in `src/domain/dates.ts` (tested) returning `{ eyebrow, range }`, e.g. `Week 48 · 2026` and `23 – 29 November`. Rules:
- Year in the eyebrow is the ISO week's year (year of its Thursday).
- Range across months: `30 November – 6 December`; across years: `29 December 2026 – 4 January 2027`.
`formatWeekLabel` stays if still used elsewhere, otherwise is removed with its tests updated.

### Brand mark and app icon

- The "Q" mark is a chunky geometric glyph (ring + cut diagonal tail), drawn as an SVG path. Lives as an inline SVG in the header template.
- The same mark, cyan on a navy rounded square, becomes the app icon: `public/favicon.ico` replaced, and a PNG wired as the Electron window icon and the packaged `.deb` icon (via `forge.config.js`). Generate the PNG/ICO once with a tool already on the machine (e.g. `rsvg-convert`, ImageMagick); commit the outputs and the SVG source. If no tool is available, ask rather than add a dependency.

### Electron

`BrowserWindow` gets `backgroundColor: '#070b12'` so there's no white flash before the UI paints.

### Style guide (the "for future features" doc)

`docs/style-guide.md` — the reference for anyone adding UI:
- the intent in a few lines (dark, confident, cyan is precious);
- the token table (copy of the source of truth in `src/styles.css`, which is canonical);
- typography scale;
- each component pattern above with its class names;
- rules for new UI: use tokens only, where cyan is allowed (today, primary action, focus, in-progress, brand) and where it isn't (large backgrounds other than brand moments), radius/spacing scale, contrast requirement, icons as inline SVG with `currentColor`, no remote assets;
- a short "adding a new component" checklist.

`CLAUDE.md` gets a line under Code rules pointing to `docs/style-guide.md`. The v1 design spec is not rewritten.

## Left to the builder

- Exact token values within the stated intent, adjusted to meet AA contrast (check muted text on surfaces and danger text).
- Exact SVG path of the Q mark and chevrons.
- Spacing scale numbers, hover shades, transition timings.
- Whether `formatWeekLabel` is kept.

## Verification

- `npm test && npm run build`.
- Run the app (`npm start`) and screenshot: current week, a dialog open, a drag in progress; compare against the chosen mockups.
- Confirm no white flash on launch and the font renders (not the fallback) in the built app.
