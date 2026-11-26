# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Quokka Tasks: a personal, offline desktop tasks app (week view + backlog). Design: `docs/superpowers/specs/2026-11-26-tasks-app-design.md`.

Stack: Electron (main process in `electron/`, compiled with `tsc`), Angular 22 UI in `src/app/` (standalone components, signals, zoneless) with `@angular/cdk` drag-drop, TypeScript, Vitest, Electron Forge for packaging only, npm (public registry via the project `.npmrc`).

## Commands

- `npm run build` — build the UI (`ng build` → `dist/renderer`) and the main process (`tsc` → `dist/electron`).
- `npm start` — build everything and run the app.
- `npm run serve` + `npm run dev` (two terminals) — run against the Angular dev server with live reload.
- `start` and `dev` pass `--no-sandbox` on purpose: Ubuntu's AppArmor blocks the Chromium sandbox for the Electron binary in `node_modules` (see README). Don't remove it. Only the packaged `.deb` runs sandboxed, so check sandbox-sensitive changes there.
- `npm test` — Vitest unit tests (`src/domain/**/*.test.ts`, `electron/**/*.test.ts`).
- `npm run make` — build and package (`.deb` + zip in `out/make/`).
- Standard verification: `npm test && npm run build`. There is no linter yet; strict TypeScript and Angular strict templates are the static check.

## Code rules

- `src/domain/` and `src/shared/` import nothing from Angular, Electron, Node or the DOM. They are compiled by both builds and hold all business rules, which are unit-tested.
- All dependencies are devDependencies (the UI is bundled; the main process uses only Node built-ins).
- All styles live in `src/styles.css`.

## Workflow

- For any non-trivial change, propose a plan and wait for approval before writing code.
- Ask before adding any new dependency, and say why it's needed and what the alternatives are.

## Git

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Work on a feature branch and merge through a PR. Don't commit directly to `main`.
