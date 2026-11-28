import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { CURRENT_VERSION } from '../src/domain/migrate';
import { emptyDataFile, parseDataFile } from '../src/domain/validate';
import type { LoadResult } from '../src/shared/api';
import type { DataFile } from '../src/shared/types';

export interface Store {
    load(): Promise<LoadResult>;
    save(data: DataFile): Promise<void>;
    /** Resolves once every save requested so far has finished (successfully or not). */
    whenIdle(): Promise<void>;
}

export function createStore(dir: string): Store {
    const file = path.join(dir, 'tasks.json');
    const temp = path.join(dir, 'tasks.json.tmp');
    let queue: Promise<void> = Promise.resolve();

    async function write(data: DataFile): Promise<void> {
        const text = JSON.stringify(data, null, 2);
        await fs.mkdir(dir, { recursive: true });
        const handle = await fs.open(temp, 'w');
        try {
            await handle.writeFile(text, 'utf8');
            await handle.sync(); // make sure the bytes are on disk before the rename publishes them
        } finally {
            await handle.close();
        }
        await fs.rename(temp, file); // atomic replace: a crash leaves either the old or the new file
        await syncDir(dir);
    }

    function save(data: DataFile): Promise<void> {
        // Serialize writes so the last call always wins, even if an earlier one failed.
        const result = queue.then(() => write(data));
        queue = result.catch(() => undefined);
        return result;
    }

    return {
        async load() {
            let text: string;
            try {
                text = await fs.readFile(file, 'utf8');
            } catch (e) {
                if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { data: emptyDataFile(), notice: null };
                throw e;
            }
            const parsed = parseDataFile(text);
            if (parsed) {
                if (parsed.fromVersion < CURRENT_VERSION) {
                    // Keep the original before anything can overwrite it; if this throws, load fails and nothing is saved.
                    await writeBackup(dir, parsed.fromVersion, text);
                    // Save the migrated file now, so later launches don't migrate (and back up) it again.
                    // If this fails, the data is still loaded and the next save retries.
                    await save(parsed.data).catch(() => undefined);
                }
                return { data: parsed.data, notice: null };
            }

            const name = `tasks.corrupt-${stamp()}.json`;
            await fs.rename(file, path.join(dir, name));
            return {
                data: emptyDataFile(),
                notice: `Your data file couldn't be read. It was kept as ${name} and the app started empty.`,
            };
        },

        save,

        whenIdle() {
            return queue;
        },
    };
}

const stamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

/** Write `tasks.v<n>.backup.json`, or a timestamped name if that exists. Never overwrites a backup. */
async function writeBackup(dir: string, version: number, text: string): Promise<void> {
    const write = async (name: string): Promise<void> => {
        const handle = await fs.open(path.join(dir, name), 'wx');
        try {
            await handle.writeFile(text, 'utf8');
            await handle.sync();
        } finally {
            await handle.close();
        }
    };
    try {
        await write(`tasks.v${version}.backup.json`);
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        await write(`tasks.v${version}.backup-${stamp()}.json`);
    }
}

/** Persist the rename itself. Directories can't be opened for sync on Windows, so this is best-effort. */
async function syncDir(dir: string): Promise<void> {
    if (process.platform === 'win32') return;
    try {
        const handle = await fs.open(dir, 'r');
        try {
            await handle.sync();
        } finally {
            await handle.close();
        }
    } catch {
        // Not fatal: the file contents are already synced.
    }
}
