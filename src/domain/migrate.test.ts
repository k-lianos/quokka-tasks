import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CURRENT_VERSION, migrate } from './migrate';
import { parseDataFile } from './validate';

const v1Text = readFileSync(new URL('./fixtures/tasks.v1.json', import.meta.url), 'utf8');
const defaults = { priority: 'normal', estimate: '', link: '' };

test('the v1 fixture migrates to v2 keeping every field', () => {
    const v1 = JSON.parse(v1Text);
    expect(migrate(JSON.parse(v1Text))).toEqual({
        fromVersion: 1,
        file: { version: 2, tickets: v1.tickets.map((t: object) => ({ ...t, ...defaults })) },
    });
});

test('the v1 fixture parses all the way to the current version', () => {
    const parsed = parseDataFile(v1Text)!;
    expect(parsed).not.toBeNull();
    expect(parsed.fromVersion).toBe(1);
    expect(parsed.data.version).toBe(CURRENT_VERSION);
    expect(parsed.data.tickets).toHaveLength(5);
    expect(parsed.data.tickets.map(t => t.updatedAt)).toEqual(JSON.parse(v1Text).tickets.map((t: { updatedAt: string }) => t.updatedAt));
});

test('stray v1 keys are overwritten by the defaults', () => {
    const r = migrate({ version: 1, tickets: [{ id: 'a', priority: 'urgent', estimate: 5 }] });
    expect(r!.file).toEqual({ version: 2, tickets: [{ id: 'a', ...defaults }] });
});

test('current version passes through unchanged', () => {
    const v2 = { version: 2, tickets: [{ id: 'a', priority: 'high', estimate: '1h', link: '' }] };
    expect(migrate(structuredClone(v2))).toEqual({ fromVersion: 2, file: v2 });
});

test('unknown versions are rejected', () => {
    for (const raw of [{ version: 3 }, { version: 0 }, { version: 1.5 }, { version: '1' }, {}, null, []]) {
        expect(migrate(raw)).toBeNull();
    }
});
