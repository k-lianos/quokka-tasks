// Builds packaging/icon.icns (the macOS app icon) from assets-src/icon-macos.svg.
// Renders each size with Inkscape, then writes the .icns container (a header plus one PNG per
// size, see https://en.wikipedia.org/wiki/Apple_Icon_Image_format), so it also runs on Linux.
// Usage: node assets-src/make-icns.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SVG = 'assets-src/icon-macos.svg';
const OUT = 'packaging/icon.icns';
// [icns type, pixel size]: 16–512 at 1x, plus the @2x (Retina) variants.
const ENTRIES = [
    ['icp4', 16],
    ['icp5', 32],
    ['ic11', 32],
    ['icp6', 64],
    ['ic12', 64],
    ['ic07', 128],
    ['ic08', 256],
    ['ic13', 256],
    ['ic09', 512],
    ['ic14', 512],
    ['ic10', 1024],
];

const dir = mkdtempSync(join(tmpdir(), 'icns-'));
try {
    const chunks = ENTRIES.map(([type, size]) => {
        const png = join(dir, `${size}.png`);
        execFileSync('inkscape', [SVG, '-w', String(size), '-h', String(size), '-o', png], { stdio: 'ignore' });
        const data = readFileSync(png);
        const header = Buffer.alloc(8);
        header.write(type, 0, 'ascii');
        header.writeUInt32BE(data.length + 8, 4);
        return Buffer.concat([header, data]);
    });
    const body = Buffer.concat(chunks);
    const header = Buffer.alloc(8);
    header.write('icns', 0, 'ascii');
    header.writeUInt32BE(body.length + 8, 4);
    writeFileSync(OUT, Buffer.concat([header, body]));
    console.log(`Wrote ${OUT}`);
} finally {
    rmSync(dir, { recursive: true, force: true });
}
