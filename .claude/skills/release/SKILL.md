---
name: release
description: Cut a release of Quokka Tasks end to end (version bump PR, tag, GitHub Release with the Linux .deb + .zip and the macOS .zip files).
argument-hint: '[version | patch | minor | major]'
disable-model-invocation: true
---

Run the procedure in `docs/releasing.md`. Read it first; it is the single source of truth for
the commands. This file adds the gates around it.

Requested version: `$ARGUMENTS` (empty means: propose one).

## 1. Preflight

All of these hold before anything changes; report any that don't and stop:

- working tree clean, on `main`, level with `origin/main` after `git pull`
- the latest CI run on `main` is green (`gh run list --branch main --workflow ci.yml --limit 1`)
- `npm test && npm run build` pass locally

## 2. Choose the version

Use the requested version if given (`patch`/`minor`/`major` resolve against `package.json`).
Otherwise propose one from the commits since the last tag, using the table in
`docs/releasing.md`. The tag `v<version>` must not exist locally or on `origin`.

## 3. Confirm once

Show the user: current → new version, and the commit list going into it. Ask one question:
release it? This confirmation authorises every later step, including merging the bump PR and
pushing the tag, so after a yes run straight through to the end.

## 4. Execute

Follow steps 1–3 of `docs/releasing.md` with the chosen version. Wait on CI with
`gh pr checks --watch` and on the release with `gh run watch`.

Done means all three are observed, not assumed:

- the release workflow run for the tag concluded `success`
- `gh release view v<version>` lists exactly one `.deb` and three `.zip` files (`linux-x64`, `darwin-arm64`, `darwin-x64`)
- local `main` is at the merged bump commit

## 5. Report

Give the release URL and the install commands from step 4 of `docs/releasing.md`. The user
runs those (`sudo`).

## On failure

Diagnose from the logs (`gh run view <id> --log-failed`) and report the cause. Moving a tag
follows "When a release fails" in `docs/releasing.md` and needs the user's go-ahead first, and
only while no GitHub Release exists for that tag.
