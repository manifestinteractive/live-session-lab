# AI development setup

Status: Phase 2 code received human acceptance. Phase 3 implements resilience and privacy.
The user reported successful desktop/iPhone streaming. Remaining physical-device checks and Phase 3 human review are pending.
The user selected Codex with GPT-6 Astra. Repository configuration preserves the selected model and permission settings.
The [development plan](../planning-docs/README.md) defines the application and phase boundaries.

## Setup

Use Node.js 22.12.0 or newer and npm. Run these commands from the repository root:

```sh
npm ci
npm run ai:browser:install
npm run test:browser:install
npm run ai:check
npm run ai:mcp:smoke
npm run ai:shadcn:smoke
```

The MCP installer downloads its matching Chromium build into ignored `.cache/ms-playwright/`.
The test installer downloads Chromium and WebKit for the separate application test package.
If the default npm cache is unavailable, prefix npm commands with `npm_config_cache=.cache/npm`.
No application credentials are needed for these checks.

Open a new Codex session from the repository root after configuration changes.
Project MCP configuration loads only for trusted projects. Check `/mcp` for connected servers.
The session-start hook needs review and trust through `/hooks` before Codex runs it.
This is a Codex hook requirement. The hook only prints context; it does not edit files or run tests.
The hook was prepared here. Its native activation depends on that trust review.
See the official [MCP configuration](https://developers.openai.com/codex/mcp) and [hook documentation](https://developers.openai.com/codex/hooks).

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
Phase 1 created `components.json` with the Base UI `base-nova` preset and the official registry.
The generated component source lives in `src/components/ui/`.

The tested MCP search response contains `[object Promise]` in generated add-command fields.
Use the pinned CLI directly for component changes, such as `npm run ai:shadcn -- add @shadcn/button` during authorized application work.
The smoke check verifies registry search; it does not claim component installation was tested.

## Validation commands

| Command                            | Checks                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run ai:check`                 | Lockfile consistency, configuration syntax, skill metadata, scripts, hook output, and local documentation links. |
| `npm run ai:mcp:smoke`             | MCP connection, fixture navigation, snapshot, button interaction, and screenshot capture.                        |
| `npm run ai:docs:smoke`            | Connection and tool discovery for both documentation servers.                                                    |
| `npm run ai:shadcn:smoke`          | shadcn MCP connection, tool discovery, and a read-only search for the official button component.                 |
| `npm run ai:shadcn -- <arguments>` | Run the pinned shadcn CLI. Mutating commands remain limited to the authorized phase.                             |
| `npm run ai:verify`                | Scaffolding, lint, type checks, unit tests, browser tests, and production build.                           |

`ai:verify` runs the real application commands and fails if any command fails or is missing.
The browser suite owns port 3100. Stop other development servers before running it.
Keep automated browser tests separate from exploratory MCP checks. Do not use the tooling fixture as an application test.
Keep screenshots and traces in ignored `artifacts/`. Use synthetic data and exclude credentials from evidence.
The browser workflow requires the agent to view screenshots, not merely save them.
Fake media and browser automation do not prove communication between physical devices.

## Validation record

Validated on 2026-09-10 using macOS arm64, Node.js 26.8.1, npm 11.19.0, and Codex CLI 0.153.4.

| Check                             | Actual result                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| Dependency installation           | Passed. npm reported zero known vulnerabilities for 99 audited packages.                       |
| `npm run ai:check`                | Passed.                                                                                        |
| Bundled skill-creator validator   | Passed for all three repository skills.                                                        |
| `codex mcp get playwright --json` | Loaded the project launcher and reported `enabled: true`.                                      |
| Session-start command             | Returned valid context JSON from both the repository root and `docs/`.                         |
| Documentation MCP checks          | Connected to LiveKit Docs with 9 tools and OpenAI Docs with 5 tools.                           |
| Playwright MCP smoke check        | Passed navigation, snapshot, button interaction, and PNG capture.                              |
| Screenshot inspection             | Viewed `artifacts/playwright/tooling-smoke.png`; the fixture showed the confirmed interaction. |
| Application verification guard    | Exited with code 1 and named all five missing application commands, as intended.               |
| Git whitespace and ignore checks  | Passed. Browser evidence, caches, and dependencies remain ignored.                             |

Chromium failed to launch inside the restricted shell sandbox. The browser check passed with approved local process access.
The smoke script uses the installed MCP tool schema, including `target` for clicks and `scale` for screenshots.
No browser sandbox protections were disabled in repository configuration.
These historical results validate the tooling fixture only. At that point, no application or physical-device check existed.
The new MCP tools are configured for subsequent Codex sessions; this session verified them through an MCP client script.
Native hook activation and optional agent spawning were not exercised. Review the hook through `/hooks` in a new Codex session.
No commit, push, or deployment occurred.

The table above records the initial scaffolding checks. It does not claim that later changes reran those checks.
See the [validation record](../planning-docs/validation.md) for subsequent planning and application results.

## Next.js local documentation

Next.js 16.3.4 includes versioned guides under `node_modules/next/dist/docs/`.
Read the relevant installed guide before framework changes. The development server also adds its official guidance block to `AGENTS.md`.
That generated block is retained unchanged. It contains upstream wording and punctuation.
