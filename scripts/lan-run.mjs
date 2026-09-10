import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [command, ...args] = process.argv.slice(2);

if (!['dev', 'invite'].includes(command) || !existsSync(resolve(root, '.env.lan.local'))) {
  console.error('Run npm run lan:setup -- <local IPv4 address> before dev:lan or invite:lan.');
  process.exitCode = 1;
} else {
  // Spawn without --env-file in execArgv. Next.js forwards those flags to NODE_OPTIONS,
  // where Node.js rejects them when it starts the development worker.
  let env = {};
  for (const name of ['.env', '.env.local', '.env.lan.local']) {
    const path = resolve(root, name);
    if (existsSync(path)) env = { ...env, ...parseEnv(readFileSync(path, 'utf8')) };
  }
  env = { ...env, ...process.env };
  const target = command === 'dev' ? [
    'node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0', '--port', '3000',
    '--experimental-https', '--experimental-https-key', '.cache/lan/server-key.pem',
    '--experimental-https-cert', '.cache/lan/server.pem',
  ] : ['scripts/operator/invite.mjs'];
  const child = spawn(process.execPath, [...target, ...args], { cwd: root, env, stdio: 'inherit' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('error', () => { console.error('Cannot start the LAN command.'); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}
