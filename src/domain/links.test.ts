import { expect, test } from 'vitest';
import { isOpenableUrl } from './links';

test('http and https urls are openable', () => {
    expect(isOpenableUrl('https://example.com/a?b=1')).toBe(true);
    expect(isOpenableUrl('http://localhost:3000')).toBe(true);
});

test('everything else is not', () => {
    for (const url of [
        '',
        '   ',
        'www.example.com',
        'example.com/x',
        '/relative',
        'file:///etc/passwd',
        'javascript:alert(1)',
        'mailto:a@b.c',
        'ftp://x.y',
    ]) {
        expect(isOpenableUrl(url), url).toBe(false);
    }
});
