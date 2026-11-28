// Data file migrations. Each step turns a version-n file into a version-(n+1) file. Steps work on the
// raw parsed JSON and only set fields; validation happens once, after the chain, as the current version.
// Shipped steps are frozen: fix mistakes with a new version (docs/architecture.md, "Versioning and migrations").

export const CURRENT_VERSION = 2;

type RawFile = Record<string, unknown>;

/** STEPS[n - 1] migrates version n to n + 1. */
const STEPS: ReadonlyArray<(file: RawFile) => RawFile> = [
    // 1 -> 2: priority, estimate and link. Every v1 ticket had ordinary priority.
    file => ({
        ...file,
        version: 2,
        tickets: Array.isArray(file['tickets'])
            ? file['tickets'].map(t => (typeof t === 'object' && t !== null ? { ...t, priority: 'normal', estimate: '', link: '' } : t))
            : file['tickets'],
    }),
];

/** Lift a parsed file to CURRENT_VERSION. Null when its version is missing, unknown or newer than this app. */
export function migrate(raw: unknown): { file: unknown; fromVersion: number } | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const fromVersion = (raw as RawFile)['version'];
    if (typeof fromVersion !== 'number' || !Number.isInteger(fromVersion) || fromVersion < 1 || fromVersion > CURRENT_VERSION) {
        return null;
    }
    let file = raw as RawFile;
    for (let v = fromVersion; v < CURRENT_VERSION; v++) file = STEPS[v - 1](file);
    return { file, fromVersion };
}
