import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'smol-toml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies, 'Lockfile dependencies differ from package.json');
assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies, 'Lockfile application dependencies differ from package.json');
const config = parse(read('.codex/config.toml'));
const markdownFiles = (directory) => readdirSync(resolve(root, directory), { withFileTypes: true })
  .flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
const checkPlanningReferences = (text, source) => {
  for (const match of text.matchAll(/(?:planning-docs|docs|\.agents\/skills)\/[\w./-]+\.md/g)) {
    assert(existsSync(resolve(root, match[0])), `${source}: missing reference ${match[0]}`);
  }
};
assert(config.mcp_servers.playwright, 'Missing Playwright MCP configuration');
assert(config.mcp_servers.shadcn?.enabled, 'Missing or disabled shadcn MCP configuration');
assert(existsSync(resolve(root, '.agents/skills/shadcn/SKILL.md')), 'Missing official shadcn skill');
for (const [name, server] of Object.entries(config.mcp_servers)) {
  if (server.command === 'node') assert(existsSync(resolve(root, server.args[0])), `Missing MCP launcher: ${name}`);
  if (server.url) assert.equal(new URL(server.url).protocol, 'https:');
}
for (const filename of readdirSync(resolve(root, '.codex/agents'))) {
  const agent = parse(read(`.codex/agents/${filename}`));
  for (const key of ['name', 'description', 'developer_instructions']) assert(agent[key], `${filename}: missing ${key}`);
  checkPlanningReferences(agent.developer_instructions, filename);
}
for (const name of readdirSync(resolve(root, '.agents/skills'))) {
  const skill = read(`.agents/skills/${name}/SKILL.md`);
  assert(skill.startsWith(`---\nname: ${name}\n`), `${name}: invalid skill name`);
  assert(/^description: .+$/m.test(skill), `${name}: missing description`);
}
for (const name of readdirSync(resolve(root, 'scripts/ai')).filter((name) => name.endsWith('.mjs'))) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, 'scripts/ai', name)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
const hook = spawnSync(process.execPath, [resolve(root, 'scripts/ai/session-start.mjs')], { encoding: 'utf8', cwd: root });
assert.equal(hook.status, 0, hook.stderr);
const context = JSON.parse(hook.stdout).hookSpecificOutput;
assert.equal(context.hookEventName, 'SessionStart');
checkPlanningReferences(context.additionalContext, 'SessionStart context');
for (const path of ['README.md', 'AGENTS.md', ...markdownFiles('docs'), ...markdownFiles('planning-docs'), ...markdownFiles('.agents/skills')]) {
  checkPlanningReferences(read(path), path);
  for (const match of read(path).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:|^#/.test(match[1])) continue;
    assert(existsSync(resolve(root, dirname(path), match[1].split('#')[0])), `${path}: broken link ${match[1]}`);
  }
}
console.log('Scaffolding checks passed: dependency lock, TOML, skill metadata, script syntax, hook context, planning references, and documentation links.');
console.log('This command does not validate application behavior or real media.');
