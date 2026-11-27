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

const data = (...ids: string[]): DataFile => ({ version: 1, tickets: ids.map(id => makeTicket({ id })) });

test('missing file loads empty with no notice', async () => {
    expect(await createStore(dir).load()).toEqual({ data: { version: 1, tickets: [] }, notice: null });
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
    const bad = { version: 1, tickets: [] } as unknown as DataFile;
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
    const bad = { version: 1, tickets: [] } as unknown as DataFile;
    (bad as unknown as { self: unknown }).self = bad;
    s.save(bad).catch(() => undefined);
    await expect(s.whenIdle()).resolves.toBeUndefined();
});
