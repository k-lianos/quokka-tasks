import { expect, test } from 'vitest';
import { makeTicket } from './testUtils';
import { emptyDataFile, parseDataFile } from './validate';

const good = { version: 2, tickets: [makeTicket({ id: 'a', position: 4 })] };
const withTicket = (over: Record<string, unknown>) => JSON.stringify({ version: 2, tickets: [{ ...makeTicket({ id: 'a' }), ...over }] });

test('emptyDataFile', () => {
    expect(emptyDataFile()).toEqual({ version: 2, tickets: [] });
});

test('a valid file parses and positions are repaired', () => {
    expect(parseDataFile(JSON.stringify(good))!.data.tickets[0].position).toBe(0);
});

test('invalid files are rejected', () => {
    expect(parseDataFile('not json')).toBeNull();
    expect(parseDataFile('null')).toBeNull();
    expect(parseDataFile(JSON.stringify({ ...good, version: 3 }))).toBeNull();
    expect(parseDataFile(withTicket({ priority: 'urgent' }))).toBeNull();
    expect(parseDataFile(withTicket({ priority: undefined }))).toBeNull();
    expect(parseDataFile(withTicket({ estimate: 3 }))).toBeNull();
    expect(parseDataFile(withTicket({ link: null }))).toBeNull();
    expect(parseDataFile(JSON.stringify({ version: 2 }))).toBeNull();
    expect(parseDataFile(withTicket({ status: 'done' }))).toBeNull();
    expect(parseDataFile(withTicket({ date: '26/11/2026' }))).toBeNull();
    expect(parseDataFile(withTicket({ title: '' }))).toBeNull();
    expect(parseDataFile(withTicket({ position: 'x' }))).toBeNull();
    expect(parseDataFile(withTicket({ description: undefined }))).toBeNull();
    expect(parseDataFile(JSON.stringify({ version: 2, tickets: [makeTicket({ id: 'a' }), makeTicket({ id: 'a' })] }))).toBeNull();
});
