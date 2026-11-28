import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { CURRENT_VERSION, migrate } from './migrate';
import { parseDataFile } from './validate';

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const v1Text = fixture('tasks.v1.json');
/** The expected result of migrating tasks.v1.json, committed so the 1 -> 2 step can't drift unnoticed. */
const expectedV2 = JSON.parse(fixture('tasks.v1.migrated.json'));
const defaults = { priority: 'normal', estimate: '', link: '' };

test('the v1 fixture migrates to the committed expected v2 file', () => {
    expect(migrate(JSON.parse(v1Text))).toEqual({ fromVersion: 1, file: expectedV2 });
});

test('the v1 fixture parses all the way to the current version', () => {
    const parsed = parseDataFile(v1Text)!;
    expect(parsed).not.toBeNull();
    expect(parsed.fromVersion).toBe(1);
    expect(parsed.data.version).toBe(CURRENT_VERSION);
    expect(parsed.data).toEqual(expectedV2);
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
