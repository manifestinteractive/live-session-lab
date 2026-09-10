# Live Session Lab

An independent experiment with browser video and AI-assisted development.
The planned release connects two people through private invitations with LiveKit and WebRTC.

Phase 1 is a disconnected interface demonstration. It includes an introduction, a pre-join shell, and a room shell.
Calls and invitations are not implemented. Camera and microphone access remain off.
Use made-up display names and test conversations only. Keep sensitive information out of the demo.

## Run locally

Use Node.js 22.12.0 or newer and npm. The implementation was checked with Node.js 26.8.1.

```sh
npm ci
npm run dev
```

Open [the setup](http://localhost:3000) or [the room preview](http://localhost:3000/room).
No credentials or provider accounts are required for Phase 1.

The stack uses Next.js App Router, React, TypeScript, shadcn/ui with Base UI, and Tailwind CSS v4.
Component source lives in `src/components/ui/`. Theme variables live in `src/app/globals.css`.
System fonts require no external font service.

## Check the application

Install browser binaries once, then run the full check:

```sh
npm run test:browser:install
npm run ai:verify
```

Stop the development server before verification. The browser suite starts its own server on port 3100.
Verification runs scaffolding checks, ESLint, TypeScript, three component tests, browser tests, and a production build.
Chromium and WebKit automation cover the disconnected interface. They do not prove physical-device behavior or working calls.

Run individual checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, or `npm run build`.
Use `npm start` after a successful build to inspect the production build locally.
Raw test traces and screenshots stay in ignored `artifacts/`.

## Configuration for later phases

`.env.example` contains placeholders for future LiveKit credentials, invitation signing, and the application origin.
When Phase 2 needs credentials, copy it to ignored `.env.local` and enter values locally.
Never commit secrets or paste them into chat. Keep `ADMISSION_ENABLED=false` until admission is implemented and reviewed.
There is no admission endpoint in Phase 1; changing this setting cannot enable calls.

The intended hosting uses LiveKit Cloud Build and Vercel Hobby free plans.
Verify account plans and current limits before any deployment. No service has been provisioned or deployed by this increment.

## Planning and AI development

- [Development plan](planning-docs/README.md): complete requirements and phase boundaries.
- [Architecture](planning-docs/architecture.md): implementation, target system, and decisions.
- [Validation](planning-docs/validation.md): actual checks, limitations, and human review.
- [Privacy and cost](planning-docs/privacy-and-cost.md): data boundaries and operating limits.
- [AI development setup](docs/ai-development.md): Codex skills and MCP tools.

The human selects a phase. The coding agent implements that phase, runs checks, and inspects screenshots through Playwright MCP.
The human reviews the result before the next phase. Commit, push, and deployment require a separate instruction.
