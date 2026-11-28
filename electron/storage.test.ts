import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { beforeEach, expect, test } from 'vitest';
import { makeTicket } from '../src/domain/testUtils';
import type { DataFile } from '../src/shared/types';
import { createStore } from './storage';

let dir: string;
beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qt-'));
});

const data = (...ids: string[]): DataFile => ({ version: 2, tickets: ids.map(id => makeTicket({ id })) });

test('missing file loads empty with no notice', async () => {
    expect(await createStore(dir).load()).toEqual({ data: { version: 2, tickets: [] }, notice: null });
});

test('save then load round-trips and leaves no temp file', async () => {
    const s = createStore(dir);
    await s.save(data('a'));
    expect((await s.load()).data).toEqual(data('a'));
    expect(await fs.readdir(dir)).toEqual(['tasks.json']);
});

test('corrupt file is renamed, never overwritten, and reported', async () => {
    await fs.writeFile(path.join(dir, 'tasks.json'), '{oops');
    const r = await createStore(dir).load();
    expect(r.data.tickets).toEqual([]);
    const files = await fs.readdir(dir);
    const backup = files.find(f => /^tasks\.corrupt-.+\.json$/.test(f))!;
    expect(await fs.readFile(path.join(dir, backup), 'utf8')).toBe('{oops');
    expect(files).not.toContain('tasks.json');
    expect(r.notice).toContain(backup);
});

test('concurrent saves are serialized; last one wins', async () => {
    const s = createStore(dir);
    await Promise.all([s.save(data('first')), s.save(data('second'))]);
    expect((await s.load()).data.tickets[0].id).toBe('second');
});

test('a failed save does not block later saves', async () => {
    const s = createStore(dir);
    const bad = { version: 2, tickets: [] } as unknown as DataFile;
    (bad as unknown as { self: unknown }).self = bad; // circular → JSON.stringify throws
    await expect(s.save(bad)).rejects.toThrow();
    await s.save(data('after'));
    expect((await s.load()).data.tickets[0].id).toBe('after');
});

test('save creates the directory if needed', async () => {
    await createStore(path.join(dir, 'nested')).save(data());
    expect(await fs.readdir(path.join(dir, 'nested'))).toEqual(['tasks.json']);
});

test('whenIdle resolves only after queued saves have reached the disk', async () => {
    const s = createStore(dir);
    void s.save(data('pending'));
    await s.whenIdle();
    const text = await fs.readFile(path.join(dir, 'tasks.json'), 'utf8');
    expect(JSON.parse(text).tickets[0].id).toBe('pending');
});

test('whenIdle resolves even if the last save failed', async () => {
    const s = createStore(dir);
    const bad = { version: 2, tickets: [] } as unknown as DataFile;
    (bad as unknown as { self: unknown }).self = bad;
    s.save(bad).catch(() => undefined);
    await expect(s.whenIdle()).resolves.toBeUndefined();
});

const v1Text = JSON.stringify(
    {
        version: 1,
        tickets: [
            {
                id: 'a',
                title: 'A',
                description: '',
                status: 'pending',
                date: null,
                position: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ],
    },
    null,
    2,
);
const tasksFile = () => path.join(dir, 'tasks.json');
const backups = async () => (await fs.readdir(dir)).filter(f => /^tasks\.v1\.backup.*\.json$/.test(f)).sort();

test('a v1 file is backed up byte-for-byte and saved as v2', async () => {
    await fs.writeFile(tasksFile(), v1Text);
    const r = await createStore(dir).load();
    expect(r.data.version).toBe(2);
    expect(r.data.tickets[0]).toMatchObject({ id: 'a', priority: 'normal', estimate: '', link: '' });
    expect(await backups()).toEqual(['tasks.v1.backup.json']);
    expect(await fs.readFile(path.join(dir, 'tasks.v1.backup.json'), 'utf8')).toBe(v1Text);
    expect(JSON.parse(await fs.readFile(tasksFile(), 'utf8')).version).toBe(2);
});

test('a second load makes no new backup', async () => {
    await fs.writeFile(tasksFile(), v1Text);
    await createStore(dir).load();
    await createStore(dir).load();
    expect(await backups()).toEqual(['tasks.v1.backup.json']);
});

test('an existing backup is never overwritten', async () => {
    await fs.writeFile(path.join(dir, 'tasks.v1.backup.json'), 'old');
    await fs.writeFile(tasksFile(), v1Text);
    await createStore(dir).load();
    expect(await fs.readFile(path.join(dir, 'tasks.v1.backup.json'), 'utf8')).toBe('old');
    const stamped = (await backups()).filter(f => /^tasks\.v1\.backup-.+\.json$/.test(f));
    expect(stamped).toHaveLength(1);
    expect(await fs.readFile(path.join(dir, stamped[0]), 'utf8')).toBe(v1Text);
});

test('a v2 file creates no backup', async () => {
    await createStore(dir).save(data('a'));
    await createStore(dir).load();
    expect(await fs.readdir(dir)).toEqual(['tasks.json']);
});

test('a future-version file takes the corrupt path and creates no backup', async () => {
    await fs.writeFile(tasksFile(), JSON.stringify({ version: 3, tickets: [] }));
    const r = await createStore(dir).load();
    expect(r.notice).toContain('tasks.corrupt-');
    expect(await backups()).toEqual([]);
});

test('a failed save after migration still returns the data', async () => {
    await fs.writeFile(tasksFile(), v1Text);
    await fs.mkdir(path.join(dir, 'tasks.json.tmp')); // the temp-file open fails; the backup doesn't
    const r = await createStore(dir).load();
    expect(r.data.version).toBe(2);
    expect(await backups()).toEqual(['tasks.v1.backup.json']);
    expect(await fs.readFile(tasksFile(), 'utf8')).toBe(v1Text);
});
