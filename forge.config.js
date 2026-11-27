// Electron Forge is used only for packaging. The UI is built by the Angular CLI
// and the main process by tsc (see package.json scripts); both land in dist/.
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const KEEP = p => p === '' || p === '/package.json' || p === '/dist' || p.startsWith('/dist/');

module.exports = {
    packagerConfig: {
        asar: true,
        executableName: 'quokka-tasks',
        ignore: p => !KEEP(p),
        // packaging/icon.icns on macOS, packaging/icon.ico on Windows (Linux uses the .deb maker's icon below).
        icon: 'packaging/icon',
        appBundleId: 'io.github.k-lianos.quokka-tasks',
        appCategoryType: 'public.app-category.productivity',
    },
    hooks: {
        // The app is not signed with an Apple Developer ID. Apple Silicon refuses to run code with no
        // signature at all, and packaging breaks the signature Electron ships with, so re-sign the
        // bundle ad hoc. Users still have to allow it once (see README, "Install on macOS").
        async postPackage(_config, { platform, outputPaths }) {
            if (platform !== 'darwin') return;
            for (const dir of outputPaths) {
                const app = path.join(dir, 'Quokka Tasks.app');
                execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
            }
        },
    },
    makers: [
        { name: '@electron-forge/maker-zip', platforms: ['linux', 'darwin', 'win32'] },
        {
            name: '@electron-forge/maker-deb',
            config: { options: { name: 'quokka-tasks', productName: 'Quokka Tasks', categories: ['Office'], icon: 'public/icon.png' } },
        },
    ],
};
