import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CURRENT_VERSION, migrate } from './migrate';
import { parseDataFile } from './validate';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const v1Text = fixture('tasks.v1.json');
/** The expected result of migrating tasks.v1.json, committed so the 1 -> 2 step can't drift unnoticed. */
const expectedV2 = JSON.parse(fixture('tasks.v1.migrated.json'));
const v2Text = fixture('tasks.v2.json');
/** The expected result of migrating tasks.v2.json (2 -> 3). */
const expectedV3 = JSON.parse(fixture('tasks.v2.migrated.json'));
const defaults = { priority: 'normal', estimate: '', link: '' };

test('the v1 fixture migrates to the committed expected v2 file', () => {
    expect(migrate(JSON.parse(v1Text), 2)).toEqual({ fromVersion: 1, file: expectedV2 });
});

test('the v1 fixture parses all the way to the current version', () => {
    const parsed = parseDataFile(v1Text)!;
    expect(parsed).not.toBeNull();
    expect(parsed.fromVersion).toBe(1);
    expect(parsed.data.version).toBe(CURRENT_VERSION);
    expect(parsed.data).toEqual({ version: 3, tickets: expectedV2.tickets.map((t: object) => ({ ...t, dueTime: null })) });
});

test('stray v1 keys are overwritten by the defaults', () => {
    const r = migrate({ version: 1, tickets: [{ id: 'a', priority: 'urgent', estimate: 5 }] }, 2);
    expect(r!.file).toEqual({ version: 2, tickets: [{ id: 'a', ...defaults }] });
});

test('current version passes through unchanged', () => {
    const v3 = { version: 3, tickets: [{ id: 'a', priority: 'high', estimate: '1h', link: '', dueTime: '09:00' }] };
    expect(migrate(structuredClone(v3))).toEqual({ fromVersion: 3, file: v3 });
});

test('unknown versions are rejected', () => {
    for (const raw of [{ version: 4 }, { version: 0 }, { version: 1.5 }, { version: '1' }, {}, null, []]) {
        expect(migrate(raw)).toBeNull();
    }
});

test('the v2 fixture migrates to the committed expected v3 file', () => {
    expect(migrate(JSON.parse(v2Text))).toEqual({ fromVersion: 2, file: expectedV3 });
});

test('the v2 fixture parses with positions repaired', () => {
    const parsed = parseDataFile(v2Text)!;
    expect(parsed.fromVersion).toBe(2);
    const lone = expectedV3.tickets[3];
    expect(parsed.data).toEqual({ ...expectedV3, tickets: [...expectedV3.tickets.slice(0, 3), { ...lone, position: 0 }] });
});

test('a stray v2 dueTime is overwritten', () => {
    expect(migrate({ version: 2, tickets: [{ id: 'a', dueTime: '25:99' }] })!.file).toEqual({
        version: 3,
        tickets: [{ id: 'a', dueTime: null }],
    });
});
