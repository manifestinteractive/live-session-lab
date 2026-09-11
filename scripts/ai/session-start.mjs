import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const installed = existsSync(`${root}/node_modules/@playwright/mcp/cli.js`);
console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: [
        "Read AGENTS.md and planning-docs/README.md for scope. Use docs/developers.md for commands and docs/ai-development.md for AI tooling.",
        "Follow the current user request and phase boundary. Never infer phase authorization from this hook.",
        installed
          ? "Playwright MCP dependency is installed."
          : "Run npm ci before using local Playwright MCP.",
        "After creating or editing files, run npm run format, resolve npm run lint findings, and run npm run ai:verify before handoff.",
        "Keep browser evidence in artifacts/. Fake media and tooling smoke checks do not validate live video.",
      ].join("\n"),
    },
  }),
);
