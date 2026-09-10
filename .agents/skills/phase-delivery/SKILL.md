---
name: phase-delivery
description: Implement a requested Live Session Lab phase and prepare its review evidence. Use for phase implementation, not tooling-only changes.
---

# Phase delivery

Read `AGENTS.md`, `docs/project-brief.md`, and local `plan.md` when available.
Identify the phase explicitly requested by the user. State its scope and acceptance criteria before implementation.
Keep later phases out of the increment. Do not treat scaffolding approval as permission to build the application.

For Phase 1, add the Next.js app to this repository without replacing its tooling or instructions.
Add real lint, typecheck, test, test:e2e, and build scripts to the existing package.json.
Use focused tests for the static shell. Clearly label demonstration media states as disconnected.
Create `.env.example` with placeholders only. Document local secret entry without requesting secrets in chat.
Document the browser -> Next.js token endpoint -> LiveKit Cloud architecture and the short decision log.

For later phases, use the admission and browser skills when relevant.
Keep a concise implementation record with the date, commands, outcomes, and limitations.
Run `npm run ai:verify` after application implementation. Report failed or unavailable checks honestly.
At the phase boundary, provide review points, relevant manual checks, and a suggested commit message.
Stop for review. Do not commit, push, deploy, or start another phase without instruction.
