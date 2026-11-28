# End-to-end tests with Playwright: design

## Intent

Every feature so far was checked by hand once: the plan's last step launches the built app against a scratch profile, an agent drives it over CDP, and the check is never run again. A later change can break an earlier feature and nothing notices. This adds a Playwright suite that drives the real Electron app, ships the checks from past plans as tests, and runs on every PR, so a regression fails CI before merge.

## Goals

- Tests drive the built, real app (main process, preload, IPC, storage, Angular UI), not a stand-in.
- Each test starts from data it seeds itself, in its own scratch data directory. Real data (`~/.config/quokka-tasks/tasks.json`) is never touched.
- Tests can assert on what was saved to disk, not only on what the screen shows.
- A new `e2e` job in CI runs the suite on every PR and push to `main`.
- From now on, a plan's "check by hand" step becomes "add or extend an e2e test" wherever the check can be automated.

## Non-goals

- Pixel or screenshot comparison. Rendering differs between machines and the baselines churn on every style change. Layout rules (an ellipsis, no overlap at 900px) are asserted through DOM measurements instead.
- Running the suite on macOS or Windows in CI. Linux only for now; the existing `cross-platform` job keeps covering builds there.
- Testing the packaged `.deb` (sandboxed). Tests run the unpackaged app with `--no-sandbox`, like `npm start`.
- Replacing the Vitest unit tests. Rules stay unit-tested in `src/domain/`; e2e tests cover wiring and behaviour across the UI, IPC and disk.

## Anti-goals

- A flaky suite. A test that fails at random teaches everyone to re-run CI and ignore it. No fixed sleeps, no retries that hide flakes, no dependence on the real date or time zone of the runner.
- Tests coupled to CSS class names or DOM structure, so a restyle breaks them.

## Constraints

- One new devDependency, `@playwright/test`, approved in the conversation. No Playwright browsers are downloaded (`_electron` uses the app's own Electron), so no `npx playwright install`.
- The app is single-instance, with the lock in the user-data directory. One scratch directory per test keeps parallel tests from blocking each other.
- `start`/`dev` pass `--no-sandbox` because AppArmor blocks the dev Electron sandbox on Ubuntu; tests need it too, locally and in CI.
- Rollover moves overdue tickets to today and past days are read-only, so fixed dates in seed data would break as the calendar moves.
- CI currently sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1`; the e2e job needs the binary. Linux CI has no display, so the job runs under `xvfb-run`.
- Branch protection requires the job named `ci`; its name and steps stay unchanged.

## Approaches

1. **Playwright drives the real Electron app (`_electron.launch`)** — picked. Covers what ships, including storage, migrations, the close handshake and link opening, where data-loss bugs would live. Costs an Electron download and xvfb in CI, and one app launch per test. Playwright marks Electron support experimental, but it is widely used.
2. **Playwright in plain Chromium against the built UI with a fake `window.api`.** Faster and needs no Electron, but skips storage, IPC and migrations, and the fake can drift from the real preload. Rejected: it misses the riskiest part of the app.
3. **Keep hand-written CDP scripts, run under Vitest.** No new dependency, but rebuilds auto-waiting, locators and failure traces by hand. Rejected: flaky and hard to debug.

The user chose approach 1 and chose to run the suite on every PR in CI.

## Design

### Layout

```
playwright.config.ts      testDir e2e/, TZ pinned, trace on failure, no retries
e2e/
  app.ts                  the launch fixture and helpers
  routing.spec.ts
  tickets.spec.ts
  day-view.spec.ts
  drag.spec.ts
  focus-view.spec.ts
  data-file.spec.ts
  links.spec.ts
  layout.spec.ts
```

Specs are named `*.spec.ts`, so Vitest's `*.test.ts` include never picks them up, and vice versa.

### The launch fixture (`e2e/app.ts`)

A Playwright test fixture that, per test:

1. Creates a fresh temp directory and, if the test gave seed data, writes it there as `tasks.json` (a `DataFile` object, or raw text for the corrupt-file and old-version cases).
2. Launches `_electron.launch({ args: ['.', '--no-sandbox', '--user-data-dir=<dir>'] })` with `TZ` pinned (`Europe/Athens`, matching `vitest.config.ts`).
3. Hands the test the `ElectronApplication`, the first window's `Page`, the directory, and `readData()` which parses `tasks.json` from disk.
4. On teardown closes the app (through the normal close handshake) and deletes the directory.

It refuses to launch without a `--user-data-dir`, so no test can reach real data.

Seed helpers build tickets with the domain's own types and date functions (`src/domain/` is pure TypeScript, so e2e code may import it): `day(offset)` gives a date relative to the real today, so seeds stay valid on any day the suite runs.

Date rules for seeds and assertions:

- The Playwright process pins the same `TZ` as the app (set in `playwright.config.ts` before anything reads the date), so `day(0)` and the app agree on today.
- Week tests compute dates from the current week's Monday, not from fixed weekdays. A test that needs a past day in a week uses the previous week, since the current week has none on a Monday.
- A test that would straddle midnight can see two different "todays". The fixture records today at launch, and a test that finds the date changed during its run fails with a clear "crossed midnight" message rather than a confusing assertion.
- Saves are asynchronous: `readData()` checks on disk poll until the expected content appears (`expect.poll`), never a single read.

The clock is the real one by default. Only the test for rollover past midnight needs a controlled clock (Playwright's `page.clock`); if it can't be installed before the renderer's first load in Electron, that test is dropped and rollover on launch (an overdue ticket seeded yesterday) covers the rule.

### Selectors

Find elements by role and accessible name (`getByRole('button', { name: 'Save' })`), labels and visible text. Where an element has no accessible name, add one (an `aria-label` or a proper `<label>`), which helps keyboard and screen-reader users too. `data-testid` only as a last resort.

### Outside the window

- Links: before clicking Open, the test replaces `shell.openExternal` through `app.evaluate` with a recorder, then asserts it was called with the URL.
- Window controls (minimise, maximise, close) are out of scope beyond close, since the window manager under xvfb isn't representative.

### Initial suite

Lifted from the manual checks in `docs/superpowers/plans/`:

- **routing:** opens on `#/day/<today>`; `#/day/2026-02-30` and `#/day/garbage` go to today; a Thursday week URL snaps to its Monday; reloading on a week URL keeps the week; ‹, › and Today in both views; a day heading in Week opens that day.
- **tickets:** add a ticket to a day and to the backlog and find it in `tasks.json`; edit title, status, priority, estimate in the focus view and Save; close without Save discards every draft field; Save is disabled while the title is empty; delete asks first, then removes the ticket.
- **day-view:** Now is the In Progress ticket, otherwise the first open one; Up next shows the rest; completed tickets show under Done; deleting the Now ticket re-picks Now; a past day is read-only.
- **drag:** backlog → week column → backlog; a dropped ticket lands at the drop position (checked in the file); a completed card can't be dragged but opens on click; a drop onto a past day is refused.
- **focus-view:** a past date on a pending ticket snaps to today with the note; Completed plus last week moves it to that day's Done; due time `0930` shows `09:30` on the card, the Day row and on reopen; clearing the time removes it; "No date (backlog)" clears the time in the file; dragging a timed ticket to the backlog drops its time.
- **data-file:** an overdue open ticket rolls to the top of today on launch; a v2 file loads, leaves `tasks.v2.backup.json` equal to the fixture and saves version 3; a corrupt file is kept as `tasks.corrupt-<timestamp>.json` with the notice shown; an edit saved right before close is on disk after close.
- **links:** Open shows only for an `http(s)` draft and calls `shell.openExternal` with the draft text.
- **layout:** at 900×700, a 120-character title on a week card with a due time is ellipsized (`scrollWidth > clientWidth`) and doesn't overlap the time.

### Scripts, config, CI

- `npm run test:e2e` runs `playwright test` against the current `dist/`. It does not build; run `npm run build` first (CI does). The README and AGENTS.md say so.
- E2E code is type-checked: a `tsconfig.e2e.json` (strict) and a `tsc --noEmit -p tsconfig.e2e.json` step in `test:e2e`, so type errors in tests fail like in the rest of the repo.
- `playwright.config.ts`: `retries: 0`, `trace: 'retain-on-failure'`, a per-test timeout suited to an app launch, `forbidOnly` in CI.
- `.gitignore`: `test-results/`, `playwright-report/`.
- CI: a new `e2e` job on `ubuntu-latest`: checkout, setup-node, `npm ci` without the skip flag, `npm run build`, `xvfb-run -a npm run test:e2e`, and on failure upload the traces and report as an artifact. The user adds `e2e` as a required check in branch protection after the first green run.

### Docs

- `docs/architecture.md`: a "Testing" section (unit vs e2e, the fixture, seed-relative dates, the no-real-data rule).
- `AGENTS.md`: the `test:e2e` command, standard verification becomes `npm test && npm run build && npm run test:e2e`, and the rule that plans add e2e tests instead of one-off manual checks where possible.
- The CDP recipe in memory stays for exploratory checks and screenshots.

## Left to the builder

- Playwright version, exact timeouts and worker count (parallel locally; drop to 1 worker in CI if launches contend).
- How the fixture exposes seeding (an option per test or a `launch(seed)` helper).
- Which missing accessible names to add, as found while writing tests.
- Splitting or merging spec files as the suite takes shape.
