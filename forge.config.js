// Electron Forge is used only for packaging. The UI is built by the Angular CLI
// and the main process by tsc (see package.json scripts); both land in dist/.
const KEEP = (p) => p === '' || p === '/package.json' || p === '/dist' || p.startsWith('/dist/');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'quokka-tasks',
    ignore: (p) => !KEEP(p),
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['linux'] },
    {
      name: '@electron-forge/maker-deb',
      config: { options: { name: 'quokka-tasks', productName: 'Quokka Tasks', categories: ['Office'], icon: 'public/icon.png' } },
    },
  ],
};
