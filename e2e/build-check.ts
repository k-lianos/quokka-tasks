// Catch a stale build: e2e tests run against dist/, so a source edited after the last build would
// otherwise be tested as the old code.
import { existsSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';

export const BUILT_FILES = ['dist/electron/electron/main.js', 'dist/renderer/browser/index.html'];
const SOURCE_DIRS = ['src', 'electron'];
const notBuildInput = (rel: string) => /\.test\.ts$/.test(rel) || rel.split(path.sep).includes('fixtures');

function newest(root: string, dir: string): { rel: string; mtime: number } | null {
    let best: { rel: string; mtime: number } | null = null;
    if (!existsSync(path.join(root, dir))) return best;
    for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        const found = entry.isDirectory()
            ? newest(root, rel)
            : notBuildInput(rel)
              ? null
              : { rel, mtime: statSync(path.join(root, rel)).mtimeMs };
        if (found && (!best || found.mtime > best.mtime)) best = found;
    }
    return best;
}

/** The newest source file (relative to `root`) edited after the oldest built file, or null when the build is fresh. */
export function staleSource(root: string): string | null {
    const built = Math.min(...BUILT_FILES.map(f => statSync(path.join(root, f)).mtimeMs));
    for (const dir of SOURCE_DIRS) {
        const n = newest(root, dir);
        if (n && n.mtime > built) return n.rel.split(path.sep).join('/');
    }
    return null;
}
