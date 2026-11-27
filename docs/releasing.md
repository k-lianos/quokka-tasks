# Releasing

A release is a `v*` git tag on `main` that matches `version` in `package.json`. Pushing the
tag runs `.github/workflows/release.yml`, which runs the tests, builds the Linux `.deb` and
`.zip` on Ubuntu, the macOS `.zip` files (`arm64` and `x64`) on a macOS runner and the
Windows `x64` `.zip` on a Windows runner, and publishes them all as a GitHub Release with auto-generated notes.

In Claude Code, `/release` (optionally `/release 0.2.0` or `/release minor`) runs this whole
procedure for you.

## Choosing the version

[Semantic versioning](https://semver.org), read from the Conventional Commits since the last tag:

| Commits since the last release         | Bump  | Example       |
| -------------------------------------- | ----- | ------------- |
| Only `fix:`, `chore:`, `docs:`, ...    | patch | 0.2.0 → 0.2.1 |
| At least one `feat:`                   | minor | 0.2.0 → 0.3.0 |
| A `!` (`feat!:`) or `BREAKING CHANGE:` | major | 0.2.0 → 1.0.0 |

See what's going in with `git log --oneline $(git describe --tags --abbrev=0)..main`
(or `git log --oneline main` before the first tag).

## Steps

### 1. Bump the version on a branch and merge it

`main` is protected, so the bump goes through a PR like any other change.

```bash
git checkout main && git pull
git checkout -b chore/release-0.2.0
npm version 0.2.0 --no-git-tag-version   # or: patch | minor | major
git commit -am "chore: release 0.2.0"
git push -u origin chore/release-0.2.0
gh pr create --fill
gh pr checks --watch
gh pr merge --merge --delete-branch
```

`--no-git-tag-version` matters: plain `npm version` would tag the commit on the release
branch, but the tag belongs on `main`.

### 2. Tag `main` and push the tag

```bash
git checkout main && git pull
git tag v0.2.0
git push origin v0.2.0
```

### 3. Watch the release workflow

```bash
gh run list --workflow release.yml --limit 1
gh run watch <run-id>
```

It fails at once if the tag doesn't match `package.json`.

### 4. Check the release and install it

```bash
gh release view v0.2.0          # a .deb and linux-x64, darwin-arm64, darwin-x64 and win32-x64 .zips
gh release download v0.2.0 --pattern '*.deb' --dir /tmp/quokka
sudo apt install /tmp/quokka/quokka-tasks_0.2.0_amd64.deb
```

On a Mac, download the `darwin` zip for its architecture and open the app (it's unsigned:
see "Install on macOS" in the README).

On Windows, unzip the `win32` zip and run `quokka-tasks.exe` (unsigned: SmartScreen asks
once, see "Install on Windows" in the README).

The macOS builds are ad-hoc signed only (no Apple Developer ID, no notarisation). The
`postPackage` hook in `forge.config.js` does that signing, so it runs only on a Mac.

Releases live at https://github.com/k-lianos/quokka-tasks/releases.

## When a release fails

- **The workflow failed and no GitHub Release exists yet:** fix the cause through a PR, then
  move the tag to the new commit on `main`:

    ```bash
    git push origin :refs/tags/v0.2.0 && git tag -d v0.2.0
    git checkout main && git pull
    git tag v0.2.0 && git push origin v0.2.0
    ```

- **A GitHub Release was already published:** leave the tag alone. Fix through a PR and
  release the next patch version instead.
