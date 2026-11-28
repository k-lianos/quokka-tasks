import { isOpenableUrl } from '../src/domain/links';

/**
 * Open an http(s) link in the system browser; ignore anything else. A failed open (e.g. no handler
 * for xdg-open) is swallowed: an unhandled rejection in the main process shows an error dialog.
 */
export function openInBrowser(url: string, openExternal: (url: string) => Promise<void>): void {
    if (isOpenableUrl(url)) openExternal(url).catch(() => undefined);
}
