import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireTest = createRequire(import.meta.resolve('@playwright/test'));
const cli = resolve(dirname(requireTest.resolve('playwright/package.json')), 'cli.js');
const result = spawnSync(process.execPath, [cli, 'install', 'chromium', 'webkit'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: `${root}.cache/ms-playwright` },
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
