# Live Session Lab

## Scope and communication

Read `planning-docs/README.md` and `docs/ai-development.md` before implementation.
Use the linked planning documents as the complete project requirements.
Follow the user's current phase instruction. Scaffolding does not authorize Phase 1 implementation.
Complete one requested phase, record actual checks and limitations, then stop for review.
Do not commit, push, or deploy without the user's instruction.
Preserve existing edits. Do not replace this repository with a generated starter.

Use short, direct sentences and ASCII characters. Answer only the requested scope.
Do not add tutorials, promotional claims, or unsupported results.

## Implementation boundaries

Use Next.js App Router, React, TypeScript, and official LiveKit SDKs.
Use shadcn/ui components and Tailwind CSS v4 for the interface. Keep component source in the repository.
Use shared theme variables and responsive layouts. Add only required components.
Use LiveKit SDK state for media controls, including controls built with shadcn/ui.
Use LiveKit Cloud Build and Vercel Hobby only. Verify free limits before deployment; accept service loss at those limits.
Limit the first release to two participants with private invitations and test conversations.
Use npm and keep `package-lock.json` synchronized. The package contains the application and development tools.
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
Use `shadcn` MCP and `.agents/skills/shadcn/SKILL.md` for component discovery and composition.
The selected component registry is the official `@shadcn` registry.
Use `npm run ai:shadcn -- <arguments>` instead of the upstream skill's `npx shadcn@latest` examples to preserve the pinned version.
Run `npm run ai:shadcn -- info --json` explicitly when project context is needed; do not assume inline skill commands executed.
Create `components.json` only during authorized Phase 1 implementation. Skill installation does not authorize app initialization.
Use `playwright` MCP to inspect the running local app, including actual screenshots.
Read `.agents/skills/browser-validation/SKILL.md` when testing UI changes.
Read `.agents/skills/phase-delivery/SKILL.md` when implementing a requested phase.

Run `npm run ai:check` for scaffolding changes.
Run `npm run ai:shadcn:smoke` after changing shadcn MCP tooling.
Run `npm run ai:mcp:smoke` after changing browser tooling.
Use `npm run ai:verify` for lint, type checks, tests, and build.
Use `planning-docs/validation.md` for acceptance cases and actual results, including Mac and iPhone checks.
Keep `lint`, `typecheck`, `test`, `test:e2e`, and `build` as real application checks.
Missing app commands are an incomplete setup, never a passing application check.
Automated browser tests and fake devices do not prove real media transport.
Record physical-device checks separately from browser automation.

## Optional review agents

When the user requests delegation, use `admission_reviewer` for token and media ownership review.
Use `browser_reviewer` for independent UI inspection. Give each agent a bounded task.
Only one agent controls a given Playwright MCP browser at a time.
Review agents inherit the selected model, including GPT-6 Astra. Do not silently substitute another model.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
