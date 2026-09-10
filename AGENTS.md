# Live Session Lab

## Scope and communication

Read `docs/project-brief.md` and `docs/ai-development.md` before implementation.
Read local `plan.md` when present. It is the detailed source plan and stays ignored by Git.
Follow the user's current phase instruction. Scaffolding does not authorize Phase 1 implementation.
Complete one requested phase, record actual checks and limitations, then stop for review.
Do not commit, push, or deploy without the user's instruction.
Preserve existing edits. Do not replace this repository with a generated starter.

Use short, direct sentences and ASCII characters. Answer only the requested scope.
Do not add tutorials, promotional claims, or unsupported results.

## Implementation boundaries

Use Next.js App Router, React, TypeScript, and official LiveKit SDKs.
Use npm and keep `package-lock.json` synchronized. This package currently contains development tools only.
Verify current official documentation and compatible versions before adding application dependencies.
Keep SDK integration in a few components and server modules.
This is human-to-human video. Do not use an AI voice-agent starter.
Do not add a database, recording, transcription, analytics, AI features, or user accounts.
Label static demonstration states as disconnected demonstrations.

Invitations must protect token issuance. Keep signing secrets and API secrets on the server.
Never print credentials, invitation URLs, access tokens, or participant display names in logs or reports.
Use test identities. Keep raw browser evidence under ignored `artifacts/`.
Read `.agents/skills/livekit-admission/SKILL.md` for admission and media ownership work.

## Tools and checks

Use `livekit_docs` MCP for LiveKit documentation. Select WebRTC transport and React SDK documentation, not AI Agents examples.
Use official Next.js documentation for framework behavior. Use `openaiDeveloperDocs` MCP for Codex configuration.
Use `playwright` MCP to inspect the running local app, including actual screenshots.
Read `.agents/skills/browser-validation/SKILL.md` when testing UI changes.
Read `.agents/skills/phase-delivery/SKILL.md` when implementing a requested phase.

Run `npm run ai:check` for scaffolding changes.
Run `npm run ai:mcp:smoke` after changing browser tooling.
Once the app exists, use `npm run ai:verify` for lint, type checks, tests, and build.
Add real `lint`, `typecheck`, `test`, `test:e2e`, and `build` scripts during Phase 1.
Missing app commands are an incomplete setup, never a passing application check.
Automated browser tests and fake devices do not prove real media transport.
Record physical-device checks separately from browser automation.

## Optional review agents

When the user requests delegation, use `admission_reviewer` for token and media ownership review.
Use `browser_reviewer` for independent UI inspection. Give each agent a bounded task.
Only one agent controls a given Playwright MCP browser at a time.
Review agents inherit the selected model, including GPT-6 Astra. Do not silently substitute another model.
