import { expect, test, vi } from 'vitest';
import { openInBrowser } from './links';

test('opens http(s) links and swallows a failed open', async () => {
    // A plain function: vi.fn attaches its own handler to returned promises, which would hide the bug.
    const opened: string[] = [];
    const open = (url: string) => {
        opened.push(url);
        return Promise.reject(new Error('no handler'));
    };
    const rejections: unknown[] = [];
    const onRejection = (e: unknown) => rejections.push(e);
    process.on('unhandledRejection', onRejection);
    openInBrowser('https://example.com', open);
    await new Promise(r => setTimeout(r, 10));
    process.off('unhandledRejection', onRejection);
    expect(opened).toEqual(['https://example.com']);
    expect(rejections).toEqual([]);
});

test('never opens other schemes', () => {
    const open = vi.fn(() => Promise.resolve());
    openInBrowser('file:///etc/passwd', open);
    openInBrowser('javascript:alert(1)', open);
    expect(open).not.toHaveBeenCalled();
});
