---
name: phase-delivery
description: Implement a requested Live Session Lab phase and prepare its review evidence. Use for phase implementation, not tooling-only changes.
---

# Phase delivery

Read `AGENTS.md` and `planning-docs/README.md`.
Use `planning-docs/implementation-plan.md` for the requested phase and `planning-docs/validation.md` for acceptance cases.
Identify the phase explicitly requested by the user. State its scope and acceptance criteria before implementation.
Keep later phases out of the increment. Do not treat scaffolding approval as permission to build the application.

For Phase 1, add the Next.js app to this repository without replacing its tooling or instructions.
Configure Tailwind CSS v4 and shadcn/ui using current official Next.js integration instructions.
Keep component source in the repository. Use shared theme variables and only required components.
Add real lint, typecheck, test, test:e2e, and build scripts to the existing package.json.
Use focused tests for the static shell. Clearly label demonstration media states as disconnected.
Create `.env.example` with placeholders only. Document local secret entry without requesting secrets in chat.
Keep the diagram and decision record in `planning-docs/architecture.md` consistent with the implementation.
Follow `planning-docs/privacy-and-cost.md` for free service limits and data handling.

For later phases, use the admission and browser skills when relevant.
Record the date, commands, outcomes, and limitations in `planning-docs/validation.md`.
Keep unperformed physical-device and deployment checks marked as not run or blocked.
Run `npm run ai:verify` after application implementation. Report failed or unavailable checks honestly.
At the phase boundary, provide review points, relevant manual checks, and a suggested commit message.
Stop for review. Do not commit, push, deploy, or start another phase without instruction.
