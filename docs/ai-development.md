# AI development setup

Status: scaffolding only. Phase 1 has not started.
The user selected Codex with GPT-6 Astra. Repository configuration preserves the selected model and permission settings.
The intended application and phase boundaries are in [project-brief.md](project-brief.md).
Local `plan.md` contains the detailed plan and remains ignored by Git.

## Setup

Use Node.js 22 or newer and npm. Run these commands from the repository root:

```sh
npm ci
npm run ai:browser:install
npm run ai:check
npm run ai:mcp:smoke
```

The installer downloads the matching Chromium build into ignored `.cache/ms-playwright/`.
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
| `livekit_docs` MCP        | Read official LiveKit SDK documentation. The feedback submission tool is disabled.     |
| `openaiDeveloperDocs` MCP | Read official OpenAI documentation for Codex setup.                                    |
| `admission_reviewer`      | Optional review agent for invitation validation, token grants, and media ownership.    |
| `browser_reviewer`        | Optional review agent for UI inspection and evidence.                                  |

The Playwright launcher uses the locked local package. It does not download a new MCP release on session startup.
Version 0.0.80 of Playwright MCP depends on Playwright 1.63.0-alpha-2026-08-31. The lockfile preserves this dependency.
Use the matching browser installed by the script. Test MCP upgrades before changing the lockfile.
The launcher expects Codex to start from the repository root.
Remote documentation servers require network access. They do not manage LiveKit Cloud resources.
Server configuration follows [Microsoft's Playwright MCP documentation](https://github.com/microsoft/playwright-mcp) and [LiveKit's documentation](https://docs.livekit.io/reference/developer-tools/docs-mcp/).

Repository skills cover phase delivery, browser validation, and LiveKit admission/media ownership.
They live under `.agents/skills/`, using [Codex's repository skill discovery](https://developers.openai.com/codex/skills).
Optional review agents live under `.codex/agents/`, using the [custom agent format](https://developers.openai.com/codex/multi-agent).
Agents inherit the selected model. Use them when delegation is requested, and avoid concurrent control of the same browser.

## Validation commands

| Command                 | Checks                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run ai:check`      | Lockfile consistency, configuration syntax, skill metadata, scripts, hook output, and local documentation links. |
| `npm run ai:mcp:smoke`  | MCP connection, fixture navigation, snapshot, button interaction, and screenshot capture.                        |
| `npm run ai:docs:smoke` | Connection and tool discovery for both documentation servers.                                                    |
| `npm run ai:verify`     | Application lint, type checks, tests, browser tests, and production build, once added.                           |

`ai:verify` fails while application commands are missing. It cannot report the scaffolding as a passing application.
During Phase 1, add real `lint`, `typecheck`, `test`, `test:e2e`, and `build` commands to the existing package.
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
| Git whitespace and ignore checks  | Passed. The local plan, browser evidence, caches, and dependencies remain ignored.             |

Chromium failed to launch inside the restricted shell sandbox. The browser check passed with approved local process access.
The smoke script uses the installed MCP tool schema, including `target` for clicks and `scale` for screenshots.
No browser sandbox protections were disabled in repository configuration.
These results validate the tooling fixture only. No application, LiveKit call, or physical-device check exists yet.
The new MCP tools are configured for subsequent Codex sessions; this session verified them through an MCP client script.
Native hook activation and optional agent spawning were not exercised. Review the hook through `/hooks` in a new Codex session.
No commit, push, or deployment occurred.
