// The e2e fixture: each test launches the built app on its own scratch data directory, so real data
// (~/.config/quokka-tasks) is never touched. Seed dates are relative to the real today.
import { _electron, test as base, type ElectronApplication, type Locator, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { addDays, startOfWeek, todayLocal, weekDates } from '../src/domain/dates';
import { makeTicket } from '../src/domain/testUtils';
import type { DataFile, Ticket } from '../src/shared/types';

export { expect } from '@playwright/test';

const repoRoot = path.resolve(__dirname, '..');
const builtFiles = ['dist/electron/electron/main.js', 'dist/renderer/browser/index.html'];
const CLOSE_TIMEOUT_MS = 5000;

export interface Quokka {
    app: ElectronApplication;
    page: Page;
    dir: string;
    /** Today when the app launched. */
    today: string;
    /** `tasks.json` as saved on disk. Saves are async: wrap checks in `expect.poll`. */
    readData(): Promise<DataFile>;
    /** The file names in the data directory, sorted. */
    files(): Promise<string[]>;
}

export function day(offset: number): string {
    return addDays(todayLocal(), offset);
}

export function ticket(p: Partial<Ticket> & { id: string }): Ticket {
    return makeTicket(p);
}

export function dataFile(tickets: Ticket[]): DataFile {
    return { version: 3, tickets };
}

/** Launch the built app on `dir` and wait until it has loaded. */
export async function launch(dir: string): Promise<{ app: ElectronApplication; page: Page }> {
    for (const f of builtFiles) {
        if (!existsSync(path.join(repoRoot, f))) throw new Error(`${f} is missing. Run npm run build first.`);
    }
    if (!dir) throw new Error('launch needs a scratch data directory');
    const app = await _electron.launch({
        args: ['.', '--no-sandbox', '--lang=en-GB', `--user-data-dir=${dir}`],
        cwd: repoRoot,
        env: { ...process.env, TZ: 'Europe/Athens', LANG: 'en_GB.UTF-8' },
    });
    const page = await app.firstWindow();
    await page.getByRole('button', { name: 'Today' }).waitFor();
    return { app, page };
}

/** Close through the normal close handshake; kill the process if that hangs. */
export async function closeApp(app: ElectronApplication): Promise<void> {
    const proc = app.process();
    const exited = new Promise<void>(resolve => {
        if (proc.exitCode !== null || proc.signalCode !== null) resolve();
        else proc.once('exit', () => resolve());
    });
    const closed = app.close().catch(() => undefined);
    const timedOut = new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), CLOSE_TIMEOUT_MS));
    if ((await Promise.race([closed, timedOut])) === 'timeout') proc.kill('SIGKILL');
    await exited;
}

export const test = base.extend<{ seed: DataFile | string | null; quokka: Quokka }>({
    seed: [null, { option: true }],
    quokka: async ({ seed }, use) => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quokka-e2e-'));
        const file = path.join(dir, 'tasks.json');
        try {
            if (seed !== null) await fs.writeFile(file, typeof seed === 'string' ? seed : JSON.stringify(seed));
            const today = todayLocal();
            const { app, page } = await launch(dir);
            try {
                await use({
                    app,
                    page,
                    dir,
                    today,
                    readData: async () => JSON.parse(await fs.readFile(file, 'utf8')) as DataFile,
                    files: async () => (await fs.readdir(dir)).sort(),
                });
            } finally {
                await closeApp(app);
            }
            if (todayLocal() !== today) throw new Error('Test crossed midnight; re-run it.');
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
        }
    },
});

/** The seven dates, Monday to Sunday, of the current week plus `offsetWeeks`. */
export function weekOf(offsetWeeks: number): string[] {
    return weekDates(addDays(startOfWeek(todayLocal()), 7 * offsetWeeks));
}

/** A named ticket list: a week column (`formatDayHeader(date)`, e.g. 'Mon 23'), 'Backlog', or a Day section. */
export function list(page: Page, name: string): Locator {
    return page.getByRole('region', { name, exact: true });
}

/** Navigate by setting the hash, like a typed URL. */
export async function goTo(page: Page, hash: string): Promise<void> {
    await page.evaluate(h => {
        location.hash = h;
    }, hash);
}

/** The ticket editor (focus view). */
export function editor(page: Page): Locator {
    return page.getByRole('dialog', { name: 'Ticket' });
}

/** Add a ticket through a list's "+ add" button. */
export async function addTicket(where: Locator, title: string): Promise<void> {
    await where.getByRole('button', { name: '+ add' }).click();
    const input = where.getByPlaceholder('Ticket title, then Enter');
    await input.fill(title);
    await input.press('Enter');
}
