import { expect, test } from 'vitest';
import { makeTicket } from './testUtils';
import { emptyDataFile, parseDataFile } from './validate';

const good = { version: 3, tickets: [makeTicket({ id: 'a', position: 4 })] };
const withTicket = (over: Record<string, unknown>) => JSON.stringify({ version: 3, tickets: [{ ...makeTicket({ id: 'a' }), ...over }] });

test('emptyDataFile', () => {
    expect(emptyDataFile()).toEqual({ version: 3, tickets: [] });
});

test('a valid file parses and positions are repaired', () => {
    expect(parseDataFile(JSON.stringify(good))!.data.tickets[0].position).toBe(0);
});

test('invalid files are rejected', () => {
    expect(parseDataFile('not json')).toBeNull();
    expect(parseDataFile('null')).toBeNull();
    expect(parseDataFile(JSON.stringify({ ...good, version: 4 }))).toBeNull();
    expect(parseDataFile(withTicket({ priority: 'urgent' }))).toBeNull();
    expect(parseDataFile(withTicket({ priority: undefined }))).toBeNull();
    expect(parseDataFile(withTicket({ estimate: 3 }))).toBeNull();
    expect(parseDataFile(withTicket({ link: null }))).toBeNull();
    expect(parseDataFile(withTicket({ dueTime: '9:00' }))).toBeNull();
    expect(parseDataFile(withTicket({ dueTime: '24:00' }))).toBeNull();
    expect(parseDataFile(withTicket({ dueTime: undefined }))).toBeNull();
    expect(parseDataFile(JSON.stringify({ version: 3 }))).toBeNull();
    expect(parseDataFile(withTicket({ status: 'done' }))).toBeNull();
    expect(parseDataFile(withTicket({ date: '26/11/2026' }))).toBeNull();
    expect(parseDataFile(withTicket({ title: '' }))).toBeNull();
    expect(parseDataFile(withTicket({ position: 'x' }))).toBeNull();
    expect(parseDataFile(withTicket({ description: undefined }))).toBeNull();
    expect(parseDataFile(JSON.stringify({ version: 3, tickets: [makeTicket({ id: 'a' }), makeTicket({ id: 'a' })] }))).toBeNull();
});

test('a dated ticket with a due time parses', () => {
    expect(parseDataFile(withTicket({ date: '2026-11-26', dueTime: '09:30' }))!.data.tickets[0].dueTime).toBe('09:30');
});
