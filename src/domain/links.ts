/** True only for absolute http(s) URLs: the only links allowed to leave the app (see electron/main.ts). */
export function isOpenableUrl(url: string): boolean {
    try {
        const { protocol } = new URL(url);
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}
