import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const installed = existsSync(`${root}/node_modules/@playwright/mcp/cli.js`);
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: [
      'Read AGENTS.md, docs/project-brief.md, and the current status in docs/ai-development.md.',
      'Follow the current user request and phase boundary. Never infer phase authorization from this hook.',
      installed ? 'Playwright MCP dependency is installed.' : 'Run npm ci before using local Playwright MCP.',
      'Keep browser evidence in artifacts/. Fake media and tooling smoke checks do not validate live video.',
    ].join('\n'),
  },
}));
