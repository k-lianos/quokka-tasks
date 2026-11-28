# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Project

Quokka Tasks: a personal, offline desktop tasks app (Day view as the start screen + week view + backlog). Design: `docs/superpowers/specs/2026-11-26-tasks-app-design.md`.

Architecture (layers, data model, IPC, state, routing, build): read `docs/architecture.md` before changing code structure, and keep it up to date when the architecture changes.

Tooling: TypeScript, Vitest, npm (public registry via the project `.npmrc`).

## Commands

- `npm run build` — build the UI (`ng build` → `dist/renderer`) and the main process (`tsc` → `dist/electron`).
- `npm start` — build everything and run the app.
- `npm run serve` + `npm run dev` (two terminals) — run against the Angular dev server with live reload.
- `start` and `dev` pass `--no-sandbox` on purpose: Ubuntu's AppArmor blocks the Chromium sandbox for the Electron binary in `node_modules` (see README). Don't remove it. Only the packaged `.deb` runs sandboxed, so check sandbox-sensitive changes there.
- `npm test` — Vitest unit tests (`src/domain/**/*.test.ts`, `electron/**/*.test.ts`).
- `npm run test:e2e` — Playwright end-to-end tests (`e2e/*.spec.ts`) against the built app: run `npm run build` first. Each test launches Electron on its own scratch data directory (see "Testing" in `docs/architecture.md`).
- `npm run make` — build and package (`.deb` + zip in `out/make/`).
- `npm run format` — format everything with Prettier. A husky pre-commit hook runs lint-staged, which formats staged files with Prettier automatically.
- `npm run format:check` — check formatting without writing (CI runs this).
- CI (`.github/workflows/ci.yml`) runs `format:check`, `npm test` and `npm run build` on PRs and pushes to `main`, and a separate `e2e` job runs `npm run test:e2e` under xvfb. Releasing (version bump PR, `v*` tag, `release.yml` publishes the `.deb` + zip): follow `docs/releasing.md`; the user-invoked `/release` skill runs it end to end.
- Standard verification: `npm test && npm run build && npm run test:e2e`. There is no linter yet; strict TypeScript and Angular strict templates are the static check.

## Code rules

- Respect the layer boundaries in `docs/architecture.md`: `src/domain/` and `src/shared/` import nothing from Angular, Electron, Node or the DOM.
- Changing the shape of `tasks.json` (`DataFile`, `Ticket`): bump `version` and ship a migration in the same change, so a user on any older version upgrades without losing data. Follow "Versioning and migrations" in `docs/architecture.md`.
- All dependencies are devDependencies.
- All styles live in `src/styles.css`.
- Template event bindings call a method that returns `void` (`(click)="onBackdropClick()"`). Angular calls `preventDefault()` when a listener returns `false`, so an inline `cond && close()` silently breaks checkboxes and links inside that element.
- Keep hash URLs in the router (see `docs/architecture.md`).
- UI follows `docs/style-guide.md`: use the design tokens in `src/styles.css`, no raw colours in rules.

## Workflow

- For any non-trivial change, propose a plan and wait for approval before writing code.
- Ask before adding any new dependency, and say why it's needed and what the alternatives are.
- A plan's checks of the running app go in as e2e tests. Keep a manual check only for what a test can't judge (how something looks and feels), and say why.

## Git

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Work on a feature branch and merge through a PR. Don't commit directly to `main`.
