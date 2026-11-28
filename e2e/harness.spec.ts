import { execFileSync } from 'node:child_process';
import { dataFile, day, expect, launch, closeApp, test, ticket } from './app';
import { staleSource } from './build-check';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

test("opens on today's day view", async ({ quokka: { page, today } }) => {
    await expect(page).toHaveURL(new RegExp(`#/day/${today}$`));
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
});

test('uses the scratch data dir', async ({ quokka: { app, dir } }) => {
    expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(dir);
});

test.describe('seeded', () => {
    test.use({ seed: dataFile([ticket({ id: 'a', title: 'Seeded ticket', date: day(0) })]) });

    test('shows seeded data', async ({ quokka: { page } }) => {
        await expect(page.getByText('Seeded ticket').first()).toBeVisible();
    });
});

/** The pid and every descendant (zygote, GPU, renderer...), from ps. */
function processTree(pid: number): number[] {
    const out = execFileSync('ps', ['-e', '-o', 'pid=,ppid='], { encoding: 'utf8' });
    const rows = out
        .trim()
        .split('\n')
        .map(l => l.trim().split(/\s+/).map(Number));
    const tree = [pid];
    for (let i = 0; i < tree.length; i++) for (const [child, parent] of rows) if (parent === tree[i]) tree.push(child);
    return tree;
}
const alive = (pid: number) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

test('teardown leaves no process', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quokka-e2e-'));
    try {
        const { app } = await launch(dir);
        const pids = processTree(app.process().pid!);
        expect(pids.length).toBeGreaterThan(1); // Electron's helpers were found, so the check below means something
        await closeApp(app);
        await expect.poll(() => pids.filter(alive)).toEqual([]);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('a launch that never gets ready leaves no process', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quokka-e2e-'));
    let pid = 0;
    try {
        await expect(
            launch(dir, async app => {
                pid = app.process().pid!;
                throw new Error('not ready');
            }),
        ).rejects.toThrow('not ready');
        expect(pid).toBeGreaterThan(0);
        await expect.poll(() => alive(pid)).toBe(false);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test.describe('stale build check', () => {
    let root = '';
    const touch = async (rel: string, secondsAgo: number) => {
        const f = path.join(root, rel);
        await fs.mkdir(path.dirname(f), { recursive: true });
        await fs.writeFile(f, '');
        const t = new Date(Date.now() - secondsAgo * 1000);
        await fs.utimes(f, t, t);
    };
    test.beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'quokka-build-'));
        await touch('dist/electron/electron/main.js', 50);
        await touch('dist/renderer/browser/index.html', 50);
    });
    test.afterEach(() => fs.rm(root, { recursive: true, force: true }));

    test('a build newer than every source is fresh', async () => {
        await touch('src/app/app.ts', 100);
        await touch('electron/main.ts', 100);
        expect(staleSource(root)).toBeNull();
    });

    test('a source edited after the build is reported', async () => {
        await touch('src/app/app.ts', 100);
        await touch('electron/main.ts', 10);
        expect(staleSource(root)).toBe('electron/main.ts');
    });

    test('unit tests and fixtures are not build inputs', async () => {
        await touch('src/domain/dates.test.ts', 10);
        await touch('src/domain/fixtures/tasks.v1.json', 10);
        expect(staleSource(root)).toBeNull();
    });
});
