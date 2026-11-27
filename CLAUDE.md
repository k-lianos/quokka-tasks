# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quokka Tasks: a personal, offline desktop tasks app (Day view as the start screen + week view + backlog). Design: `docs/superpowers/specs/2026-11-26-tasks-app-design.md`.

Stack: Electron (main process in `electron/`, compiled with `tsc`), Angular 22 UI in `src/app/` (standalone components, signals, zoneless) with `@angular/cdk` drag-drop, TypeScript, Vitest, Electron Forge for packaging only, npm (public registry via the project `.npmrc`).

## Commands

- `npm run build` — build the UI (`ng build` → `dist/renderer`) and the main process (`tsc` → `dist/electron`).
- `npm start` — build everything and run the app.
- `npm run serve` + `npm run dev` (two terminals) — run against the Angular dev server with live reload.
- `start` and `dev` pass `--no-sandbox` on purpose: Ubuntu's AppArmor blocks the Chromium sandbox for the Electron binary in `node_modules` (see README). Don't remove it. Only the packaged `.deb` runs sandboxed, so check sandbox-sensitive changes there.
- `npm test` — Vitest unit tests (`src/domain/**/*.test.ts`, `electron/**/*.test.ts`).
- `npm run make` — build and package (`.deb` + zip in `out/make/`).
- `npm run format` — format everything with Prettier. A husky pre-commit hook runs lint-staged, which formats staged files with Prettier automatically.
- `npm run format:check` — check formatting without writing (CI runs this).
- CI (`.github/workflows/ci.yml`) runs `format:check`, `npm test` and `npm run build` on PRs and pushes to `main`. Pushing a `v*` tag that matches `package.json` `version` runs `release.yml`, which publishes the `.deb` + zip as a GitHub Release.
- Standard verification: `npm test && npm run build`. There is no linter yet; strict TypeScript and Angular strict templates are the static check.

## Code rules

- `src/domain/` and `src/shared/` import nothing from Angular, Electron, Node or the DOM. They are compiled by both builds and hold all business rules, which are unit-tested.
- All dependencies are devDependencies (the UI is bundled; the main process uses only Node built-ins).
- All styles live in `src/styles.css`.
- Routing uses hash URLs (`withHashLocation`, e.g. `#/day/2026-11-26`) because Electron loads the UI from `file://`; keep it that way.
- UI follows `docs/style-guide.md`: use the design tokens in `src/styles.css`, no raw colours in rules.

## Workflow

- For any non-trivial change, propose a plan and wait for approval before writing code.
- Ask before adding any new dependency, and say why it's needed and what the alternatives are.

## Git

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Work on a feature branch and merge through a PR. Don't commit directly to `main`.
