# Visual Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Quokka Tasks to the dark navy / electric cyan / royal-blue-glass look chosen from the mood board, add the Q brand mark, and write a style guide for future features.

**Architecture:** One token layer (CSS custom properties on `:root`) at the top of `src/styles.css`; every rule below uses tokens only. Templates change only for structure: the new two-line week header, inline SVG icons, and the brand lockup. One new pure function in `src/domain/dates.ts` feeds the header.

**Tech Stack:** Angular 22 (standalone, signals), plain CSS, Electron, Vitest, `@fontsource-variable/plus-jakarta-sans` (new devDependency, approved), Inkscape/ImageMagick (already installed) for one-off icon export.

**Spec:** `docs/superpowers/specs/2026-11-26-visual-style-design.md`

## Global Constraints

- All styles live in `src/styles.css`. No `styles:` or `styleUrl` in components, no inline `style=""`.
- Rules use tokens (`var(--…)`) only; raw colour values appear only in the `:root` token block.
- Token names and starting values exactly as the spec's palette table (`--color-bg #070b12`, `--color-surface #0d131d`, `--color-surface-raised #131b28`, `--color-border #1c2636`, `--color-accent #00e1f0`, `--color-on-accent #04121a`, `--color-glass-from #0f2a8a`, `--color-glass-to #0a1a55`, `--color-text #f2f6fa`, `--color-text-muted #8a97a8`, `--color-success #3ddc97`, `--color-danger`, `--color-warning`). Values may be tuned only to reach WCAG AA.
- Font: Plus Jakarta Sans variable, bundled; no remote requests (CSP `default-src 'self'` unchanged).
- `src/domain/` imports nothing from Angular, Electron, Node or the DOM.
- All dependencies are devDependencies. The only new one is `@fontsource-variable/plus-jakarta-sans`.
- Conventional Commits; work stays on `feat/visual-style`.
- Verification baseline for every task: `npm test && npm run build` passes.

## Review Focus

- **Long ticket titles** — must still truncate with an ellipsis on one line inside a card, on dark and on the glass backlog. Checked in Task 7's screenshot run with a 120-character title.
- **Narrow window (900px minWidth)** — header lockup, big date and pill must not wrap into each other; the date may shrink but the pill stays on one line. Checked in Task 7 at 900×700.
- **Keyboard focus** — Tab through header pill, cards, "+ add", dialog fields: every stop shows the cyan `:focus-visible` ring, including on the cyan Today button (ring must be offset so it's visible against cyan). Checked in Task 7.
- **Font fallback** — if the font fails to load the app must still look intentional (`system-ui` fallback with the same weights). Checked in Task 7 by confirming `document.fonts.check('800 16px "Plus Jakarta Sans Variable"')` is true in the built app.
- **Weeks spanning a year / ISO week 1 starting in December** — eyebrow year must be the ISO-week year. Pinned by Task 1 tests.

---

### Task 1: Week heading function

**Files:**

- Modify: `src/domain/dates.ts`
- Test: `src/domain/dates.test.ts`

**Interfaces:**

- Produces: `export interface WeekHeading { eyebrow: string; range: string }` and `export function formatWeekHeading(weekStart: string): WeekHeading` in `src/domain/dates.ts`.

- [ ] **Step 1: Write the failing test** in the `weeks` describe block:

```ts
test('formatWeekHeading splits week number/year from the date range', () => {
    expect(formatWeekHeading('2026-11-23')).toEqual({ eyebrow: 'Week 48 · 2026', range: '23 – 29 November' });
    expect(formatWeekHeading('2026-11-30')).toEqual({ eyebrow: 'Week 49 · 2026', range: '30 November – 6 December' });
    expect(formatWeekHeading('2026-12-28')).toEqual({ eyebrow: 'Week 53 · 2026', range: '28 December 2026 – 3 January 2027' });
    // ISO week 1 of 2026 starts in December 2025: the eyebrow uses the ISO-week year.
    expect(formatWeekHeading('2025-12-29')).toEqual({ eyebrow: 'Week 1 · 2026', range: '29 December 2025 – 4 January 2026' });
});
```

- [ ] **Step 2: Run** `npx vitest run src/domain/dates.test.ts` — Expected: FAIL, `formatWeekHeading` is not exported.

- [ ] **Step 3: Implement `formatWeekHeading`.** Add a `MONTHS_LONG` array of full month names. ISO-week year = `getFullYear()` of `addDays(weekStart, 3)` (the Thursday). Range rules: same month `D – D Month`; different month same year `D Month – D Month`; different year `D Month YYYY – D Month YYYY`. Use spaced en dash `–` everywhere. Leave `formatWeekLabel` in place (Task 3 removes it).

- [ ] **Step 4: Run** `npx vitest run src/domain/dates.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts
git commit -m "feat: add week heading formatter for the new header"
```

---

### Task 2: Tokens, font and base styles

**Files:**

- Modify: `package.json`, `package-lock.json` (via npm)
- Modify: `src/styles.css` (top of file: comment, `@import`, `:root` tokens, base `html/body/app-root/button/input/select/textarea`, `:focus-visible`, `.loading`)
- Modify: `electron/main.ts:43` (`BrowserWindow` options)

**Interfaces:**

- Produces: the token set below, used by every later CSS task.
    - Colours: as Global Constraints, plus `--color-accent-tint: rgb(0 225 240 / 0.08)` (placeholder/hover tint), `--color-backdrop: rgb(2 5 10 / 0.7)`, `--color-glass-border: #2d5cff66`, `--color-glass-card: rgb(255 255 255 / 0.07)`.
    - Radii: `--radius-sm: 9px` (pill buttons, inputs), `--radius-md: 11px` (cards), `--radius-pill-outer: 12px` (header pill), `--radius-lg: 16px` (columns), `--radius-xl: 22px` (dialogs).
    - Spacing: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-5: 24px`.
    - Type: `--font-sans: 'Plus Jakarta Sans Variable', system-ui, sans-serif`, `--font-size-body: 14px`, `--font-size-small: 12px`, `--font-size-display: 26px`, `--font-weight-heavy: 800`, `--tracking-tight: -0.03em`, `--tracking-caps: 0.08em`.
    - Effects: `--shadow-lift: 0 12px 32px rgb(0 0 0 / 0.5)`, `--focus-ring: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent)` (two-layer so it shows on cyan too), `--transition-fast: 120ms ease`.

- [ ] **Step 1: Install the font** — `npm install -D @fontsource-variable/plus-jakarta-sans`. Expected: it appears under `devDependencies`.

- [ ] **Step 2: Rewrite the top of `src/styles.css`:** replace the "Deliberately plain for v1" comment with one pointing at `docs/style-guide.md`; `@import '@fontsource-variable/plus-jakarta-sans';` first; then the `:root` token block above; then base rules: `body` uses `--color-bg`, `--color-text`, `--font-sans`, `--font-size-body`; `app-root` padding/gap `--space-4`/`--space-3`; `button, input, select, textarea { font: inherit; color: inherit; }`; `:focus-visible { outline: none; box-shadow: var(--focus-ring); }`; `.loading` muted. Leave the rest of the file untouched for now.

- [ ] **Step 3: Set** `backgroundColor: '#070b12'` in the `BrowserWindow` options in `electron/main.ts` (comment: must match `--color-bg`).

- [ ] **Step 4: Verify** `npm test && npm run build` — Expected: PASS; `ls dist/renderer/browser/media | grep -i jakarta` lists `.woff2` files (font bundled locally).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/styles.css electron/main.ts
git commit -m "feat: add design tokens, bundled font and dark base styles"
```

---

### Task 3: Header — brand lockup, two-line week, pill controls

**Files:**

- Modify: `src/app/week-header.ts`
- Modify: `src/app/app.ts:3,29-34,68`
- Modify: `src/domain/dates.ts`, `src/domain/dates.test.ts` (remove `formatWeekLabel` and its test)
- Modify: `src/styles.css` (replace the `/* Week header */` section)

**Interfaces:**

- Consumes: `formatWeekHeading(weekStart: string): WeekHeading` (Task 1); tokens (Task 2).
- Produces: `WeekHeader` input `heading = input.required<WeekHeading>()` (replaces `label`); outputs `prev`, `next`, `today` unchanged. CSS classes `.week-header`, `.brand`, `.brand-mark`, `.brand-word`, `.week-title`, `.week-eyebrow`, `.week-range`, `.pill`, `.pill-button`, `.pill-button.is-primary`, `.icon` (reused by Task 5).

- [ ] **Step 1: Template.** `WeekHeader` renders, inside `<header class="week-header">`:
    1. `.brand` — inline SVG `.brand-mark` (viewBox `0 0 32 32`, `fill="currentColor"`, `aria-hidden="true"`, path: `M16 3a13 13 0 1 0 6.9 24l3.6 3.6 4.2-4.2-3.4-3.4A13 13 0 0 0 16 3zm0 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12z`) and `<span class="brand-word">Quokka</span>`.
    2. `.week-title` — `<span class="week-eyebrow">{{ heading().eyebrow }}</span>` and `<h1 class="week-range">{{ heading().range }}</h1>`.
    3. `<div class="pill" role="group" aria-label="Week navigation">` — prev button (chevron-left SVG `.icon`, `aria-label="Previous week"`), `Today` button with `is-primary`, next button (chevron-right SVG, `aria-label="Next week"`). Chevron paths: left `M15 6l-6 6 6 6`, right `M9 6l6 6-6 6`, viewBox `0 0 24 24`, `fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`.

- [ ] **Step 2: Wire `app.ts`:** import `formatWeekHeading` instead of `formatWeekLabel`; `weekHeading = computed(() => formatWeekHeading(this.viewedWeekStart()))`; bind `[heading]="weekHeading()"`.

- [ ] **Step 3: Remove** `formatWeekLabel` from `dates.ts` and its test/import from `dates.test.ts` (no other users).

- [ ] **Step 4: CSS** per spec "Header (option 2)": `.week-header` flex, aligned end, gap `--space-5`; `.brand-mark` 30px, `--color-accent`; `.brand-word` `--font-weight-heavy` 22px `--tracking-tight`; `.week-title` left border `--color-border`, padding-left `--space-5`, `margin-right: auto`, `min-width: 0`; `.week-eyebrow` 11px heavy uppercase `--tracking-caps` `--color-accent`; `.week-range` `--font-size-display` heavy `--tracking-tight`, margin 0, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`; `.pill` `--color-surface-raised`, radius `--radius-pill-outer`, padding 3px, `flex: none`; `.pill-button` 30px tall, radius `--radius-sm`, transparent, hover `--color-accent-tint`; `.pill-button.is-primary` `--color-accent` bg, `--color-on-accent` text; `.icon` 16px square.

- [ ] **Step 5: Verify** `npm test && npm run build` — Expected: PASS (strict templates catch any leftover `label` binding).

- [ ] **Step 6: Commit**

```bash
git add src/app/week-header.ts src/app/app.ts src/domain/dates.ts src/domain/dates.test.ts src/styles.css
git commit -m "feat: restyle header with brand lockup and two-line week title"
```

---

### Task 4: Board — columns, today, past, glass backlog, cards, add, drag

**Files:**

- Modify: `src/styles.css` (sections `/* Board */`, `/* Card */`, `/* Add */`, `/* Drag and drop */`)

**Interfaces:**

- Consumes: tokens (Task 2). No template changes; existing classes `.board`, `.week`, `.backlog`, `.list`, `.is-today`, `.is-past`, `.list-heading`, `.cards`, `.card`, `.card-priority`, `.card-title`, `.card-status`, `.status-dot`, `.status-*`, `.add-button`, `.add-input`, `.card-placeholder`, `.cdk-*` keep their names.

- [ ] **Step 1: CSS** per spec "Components":
    - `.board`/`.week` gap `--space-3`; backlog width 240px.
    - `.list` `--color-surface`, radius `--radius-lg`, padding `--space-3`, no border. `.list-heading` `--font-size-small` heavy uppercase `--tracking-caps` `--color-text-muted`.
    - `.list.is-today` `box-shadow: inset 0 0 0 2px var(--color-accent)`; its heading `--color-accent`. `.list.is-past` `opacity: 0.5`.
    - `.backlog .list` `linear-gradient(160deg, var(--color-glass-from), var(--color-glass-to))` + `inset 0 0 0 1px var(--color-glass-border)`; `.backlog .card` background `--color-glass-card`; backlog heading `--color-text`.
    - `.card` `--color-surface-raised`, radius `--radius-md`, no border, padding `--space-2` `--space-3`, hover background lightened via `color-mix(in srgb, var(--color-surface-raised), white 6%)`, `transition: background var(--transition-fast)`. `.card-priority` muted heavy. `.card-status` muted. `.status-dot` `--color-text-muted`; in progress `--color-accent`; completed `--color-success`.
    - `.add-button` muted, hover `--color-accent`. (`.add-input` is styled with the dialog fields in Task 5.)
    - `.cdk-drag-preview .card` `--shadow-lift`. `.cdk-drag-placeholder, .card-placeholder` `2px dashed var(--color-accent)`, background `--color-accent-tint`, radius `--radius-md`.

- [ ] **Step 2: Verify** `npm test && npm run build` — Expected: PASS. Run `grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' src/styles.css` — Expected: matches only inside the `:root` block.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: restyle board, cards and drag-and-drop"
```

---

### Task 5: Dialogs and banners

**Files:**

- Modify: `src/app/focus-view.ts` (close button glyph → SVG), `src/app/app.ts` (banner dismiss glyph → SVG)
- Modify: `src/app/confirm-dialog.ts`, `src/app/focus-view.ts` (add `class="button"` / `button button-danger` to dialog buttons)
- Modify: `src/styles.css` (sections `/* Banners */`, `/* Dialogs */`)

**Interfaces:**

- Consumes: `.icon` class (Task 3), tokens (Task 2).
- Produces: reusable button classes `.button` (quiet: raised surface), `.button-danger` (danger text on danger-tinted bg), `.icon-button` (transparent square button holding an `.icon`). Close icon SVG: viewBox `0 0 24 24`, path `M6 6l12 12M18 6L6 18`, stroke as chevrons.

- [ ] **Step 1: Templates.** Replace `✕` in `focus-view.ts` and the banner in `app.ts` with the close SVG inside `.icon-button` (keep existing `aria-label`s). Delete buttons get `button button-danger`; Cancel gets `button`. Remove the old `.danger` class usage.

- [ ] **Step 2: CSS:**
    - `.dialog-backdrop` `--color-backdrop`. `.dialog` `--color-surface`, radius `--radius-xl`, padding `--space-5`, `--shadow-lift`, inner `1px` `--color-border` ring.
    - `.focus-header` muted; `.field` label muted small heavy; `.field input, select, textarea` and `.add-input` share one rule: `--color-surface-raised`, no border, radius `--radius-sm`, padding `--space-2` `--space-3`. `select` keeps a native arrow (no custom arrow needed). `.field-error` `--color-danger`.
    - `.button` raised surface, radius `--radius-sm`, padding `--space-2` `--space-4`, heavy-ish (600). `.button-danger` `--color-danger` text, background `color-mix(in srgb, var(--color-danger) 15%, transparent)`.
    - `.banner` `--color-surface-raised`, radius `--radius-md`, left `4px solid var(--color-warning)`; `.banner-error` left border `--color-danger`.
    - Pick `--color-danger` and `--color-warning` values in `:root` that reach 4.5:1 on `--color-surface` (e.g. `#ff6b6b`, `#ffc857`).

- [ ] **Step 3: Verify** `npm test && npm run build` — Expected: PASS; hex grep from Task 4 still matches only `:root`.

- [ ] **Step 4: Commit**

```bash
git add src/app/focus-view.ts src/app/confirm-dialog.ts src/app/app.ts src/styles.css
git commit -m "feat: restyle dialogs, fields and banners"
```

---

### Task 6: App icon

**Files:**

- Create: `assets-src/icon.svg` (source, not shipped), `public/icon.png` (512×512)
- Modify: `public/favicon.ico` (regenerated), `electron/main.ts` (`icon` option), `forge.config.js` (deb `icon`)

**Interfaces:**

- Consumes: the Q path from Task 3.

- [ ] **Step 1: Draw `assets-src/icon.svg`:** 512×512, rounded square `rx="112"` fill `#070b12`, the Q path scaled to ~60% and centred, fill `#00e1f0`.

- [ ] **Step 2: Export:** `inkscape assets-src/icon.svg -w 512 -h 512 -o public/icon.png` and `magick public/icon.png -define icon:auto-resize=256,64,48,32,16 public/favicon.ico`. Expected: both files exist; `file public/icon.png` reports 512 x 512.

- [ ] **Step 3: Wire:** `BrowserWindow` `icon: path.join(app.getAppPath(), 'dist/renderer/browser/icon.png')`; in `forge.config.js` deb `options.icon: 'public/icon.png'`.

- [ ] **Step 4: Verify** `npm test && npm run build` — Expected: PASS; `dist/renderer/browser/icon.png` exists.

- [ ] **Step 5: Commit**

```bash
git add assets-src/icon.svg public/icon.png public/favicon.ico electron/main.ts forge.config.js
git commit -m "feat: add Q app icon for window, favicon and deb"
```

---

### Task 7: Style guide, CLAUDE.md pointer, and visual verification

**Files:**

- Create: `docs/style-guide.md`
- Modify: `CLAUDE.md` (Code rules: one line)
- Possibly modify: `src/styles.css` (token tweaks found during verification)

**Interfaces:**

- Consumes: every class and token from Tasks 2–6 (the guide documents what was built, using the real names).

- [ ] **Step 1: Write `docs/style-guide.md`** with the sections the spec lists under "Style guide": intent; token table (note `src/styles.css` `:root` is canonical); type scale; component patterns with class names (header, columns/today/past/backlog, cards, add, dialogs, buttons, banners, drag); rules for new UI (tokens only; cyan only for brand, today, primary action, focus, in-progress; radius/spacing scale; AA contrast; inline SVG icons with `currentColor`; no remote assets; styles only in `src/styles.css`); an "adding a component" checklist. Include the ASCII board sketch from the spec.

- [ ] **Step 2: Add to `CLAUDE.md` Code rules:** `- UI follows docs/style-guide.md: use the design tokens in src/styles.css, no raw colours in rules.`

- [ ] **Step 3: Visual run** (CDP recipe, scratch user-data dir so real data is untouched): `npm run build`, then launch `npx electron . --no-sandbox --user-data-dir=<scratch> --remote-debugging-port=9333`. Seed a few tickets via the UI including one with a 120-character title; screenshot at 1400×800 and 900×700: board, focus view open, delete confirm, a drag in progress. Check every Review Focus line: ellipsis, no header overlap at 900px, focus ring visible on Tab including the Today button, `document.fonts.check('800 16px "Plus Jakarta Sans Variable"') === true`, no white flash on launch.

- [ ] **Step 4: Contrast check:** compute WCAG ratios for `--color-text-muted` on `--color-surface` and on `--color-surface-raised`, `--color-danger` on `--color-surface`, `--color-on-accent` on `--color-accent`, `--color-text` on `--color-glass-to`. Expected: ≥ 4.5 each; tune token values in `:root` if not, and mirror the change in the guide's token table.

- [ ] **Step 5: Verify** `npm test && npm run build` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/style-guide.md CLAUDE.md src/styles.css
git commit -m "docs: add style guide for future UI work"
```
