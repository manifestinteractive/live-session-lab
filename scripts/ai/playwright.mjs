import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const installing = process.argv[2] === 'install';
const cli = resolve(root, installing ? 'node_modules/playwright/cli.js' : 'node_modules/@playwright/mcp/cli.js');
const args = installing
  ? ['install', 'chromium']
  : ['--browser', 'chromium', '--headless', '--isolated', '--output-dir', resolve(root, 'artifacts/playwright')];
const child = spawn(process.execPath, [cli, ...args], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: resolve(root, '.cache/ms-playwright') },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
