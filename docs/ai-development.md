# AI development

Use [the developer guide](developers.md) for local configuration, formatting, hooks, and application checks.
Read [the project plan](../planning-docs/README.md) and `AGENTS.md` before changing the application.
The human selects the work. The coding agent implements it, records evidence, and stops at the requested review boundary.
Repository configuration preserves the selected Codex model and permission settings. Do not substitute another model silently.

## Tool setup

After `npm ci`, install the matching MCP browser and run the tooling checks:

```sh
npm run ai:browser:install
npm run ai:check
npm run ai:mcp:smoke
npm run ai:shadcn:smoke
```

Use `npm run test:browser:install` for the separate application test browsers.
Installers place browser binaries in ignored `.cache/ms-playwright/` and resolve versions from their owning packages.
Use `npm_config_cache=.cache/npm` if the default npm cache is unavailable. Tooling checks need no application credentials.

Start Codex from the repository root. Open a new session after configuration changes.
Project MCP configuration requires a trusted project. Check `/mcp` for connected servers.
Review and trust the session-start hook through `/hooks` before native activation.
The hook only prints repository context; it does not edit files, run checks, or authorize a phase.
See [Codex MCP configuration](https://developers.openai.com/codex/mcp) and [hooks](https://developers.openai.com/codex/hooks).

## Included tools

| Tool                      | Purpose                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `playwright` MCP          | Inspect the local UI and capture screenshots in an isolated headless Chromium session. |
| `shadcn` MCP              | Search and inspect components in the official shadcn/ui registry.                      |
| `livekit_docs` MCP        | Read official LiveKit SDK documentation. The feedback submission tool is disabled.     |
| `openaiDeveloperDocs` MCP | Read official OpenAI documentation for Codex setup.                                    |
| `admission_reviewer`      | Optional review agent for invitation validation, token grants, and media ownership.    |
| `browser_reviewer`        | Optional review agent for UI inspection and evidence.                                  |

The Playwright launcher uses the locked local package. It does not download a new MCP release on session startup.
Version 0.0.80 of Playwright MCP depends on Playwright 1.63.0-alpha-2026-08-31. The lockfile preserves this dependency.
Use the matching browser installed by the script. Test MCP upgrades before changing the lockfile.
The launcher expects Codex to start from the repository root.
Each browser installer resolves Playwright from its owning package to prevent version mismatches.
Remote documentation servers require network access. They do not manage LiveKit Cloud resources.
Server configuration follows [Microsoft's Playwright MCP documentation](https://github.com/microsoft/playwright-mcp) and [LiveKit's documentation](https://docs.livekit.io/reference/developer-tools/docs-mcp/).

Repository skills cover phase delivery, browser validation, and LiveKit admission/media ownership.
The official shadcn/ui skill provides component composition and Tailwind styling guidance.
They live under `.agents/skills/`, using [Codex's repository skill discovery](https://developers.openai.com/codex/skills).
Optional review agents live under `.codex/agents/`, using the [custom agent format](https://developers.openai.com/codex/multi-agent).
Agents inherit the selected model. Use them when delegation is requested, and avoid concurrent control of the same browser.

## shadcn/ui setup

The MCP uses the locally installed `shadcn` package, pinned to version 4.21.0 in the npm lockfile.
It follows the [official shadcn MCP setup](https://ui.shadcn.com/docs/mcp) and starts from the repository root.
Run `npm run ai:shadcn -- <arguments>` for CLI work. This uses the pinned package instead of downloading `latest`.

The [official skill](https://ui.shadcn.com/docs/skills) is installed under `.agents/skills/shadcn/` with its supporting references and assets.
Its files are retained unchanged from [upstream commit 3ba91b1](https://github.com/shadcn-ui/ui/tree/3ba91b1cc83e1bbe4ab35a422ff2a694849c5048/skills/shadcn).
The upstream [MIT license](licenses/shadcn-skill.txt) is included. Recheck the skill and MCP together before upgrading either.

Repository instructions select the official `@shadcn` registry and replace upstream `npx shadcn@latest` examples with the pinned CLI command.
Run `npm run ai:shadcn -- info --json` explicitly for project context; do not assume inline commands in skill text executed.
`components.json` selects the Base UI `base-nova` preset and the official registry.
The generated component source lives in `src/components/ui/`.

The tested MCP search response contains `[object Promise]` in generated add-command fields.
Use the pinned CLI directly for component changes, such as `npm run ai:shadcn -- add @shadcn/button` during authorized application work.
The smoke check verifies registry search; it does not claim component installation was tested.

## Agent check workflow

Run `npm run format` after edits, then `npm run ai:verify`. Resolve failures without disabling checks.
Prettier owns formatting and Tailwind class order. ESLint validates code; TypeScript and behavioral tests provide separate checks.
Follow the [formatting, hook, and CI instructions](developers.md#formatting-hooks-and-ci).

Use Playwright MCP to inspect UI changes. View the screenshots, test keyboard interaction, and record actual findings.
Keep credentials and real participant details out of evidence. Store raw evidence under ignored `artifacts/`.
Mocked calls and synthetic media cannot establish physical-device behavior.

## Validation commands

| Command                            | Checks                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run ai:check`                 | Lockfile consistency, configuration syntax, skill metadata, scripts, hook output, and local documentation links. |
| `npm run ai:mcp:smoke`             | MCP connection, fixture navigation, snapshot, button interaction, and screenshot capture.                        |
| `npm run ai:docs:smoke`            | Connection and tool discovery for both documentation servers.                                                    |
| `npm run ai:shadcn:smoke`          | shadcn MCP connection, tool discovery, and a read-only search for the official button component.                 |
| `npm run ai:shadcn -- <arguments>` | Run the pinned shadcn CLI. Mutating commands remain limited to the authorized phase.                             |
| `npm run ai:verify`                | Scaffolding, formatting, lint, type checks, unit tests, browser tests, and production build.                     |

`ai:verify` runs the real application commands and fails if any command fails or is missing.
The browser suite owns port 3100. Stop other development servers before running it.
Keep automated browser tests separate from exploratory MCP checks. Do not use the tooling fixture as an application test.
Keep screenshots and traces in ignored `artifacts/`. Use synthetic data and exclude credentials from evidence.
The browser workflow requires the agent to view screenshots, not merely save them.
Fake media and browser automation do not prove communication between physical devices.

## Versioned framework documentation

Next.js includes guides under `node_modules/next/dist/docs/`. Read relevant installed guides before framework changes.
The development server maintains its official guidance block in `AGENTS.md`; retain that upstream block.

## Evidence

Tooling validation and application evidence are recorded in [Validation](../planning-docs/validation.md).
Native hook activation and optional review-agent execution need their own checks; configuration alone does not prove either.
