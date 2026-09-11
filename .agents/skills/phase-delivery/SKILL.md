---
name: phase-delivery
description: Implement a requested Live Session Lab phase and prepare its review evidence. Use for phase implementation, not tooling-only changes.
---

# Phase delivery

Read `AGENTS.md` and `planning-docs/README.md`.
Use `planning-docs/implementation-plan.md` for the requested phase and `planning-docs/validation.md` for acceptance cases.
Identify the phase explicitly requested by the user. State its scope and acceptance criteria before implementation.
Keep later phases out of the increment. Do not treat scaffolding approval as permission to build the application.

Use `docs/developers.md` for commands and configuration. Preserve the working application and existing tooling.
Use shared theme variables and only required shadcn/ui components. Keep secrets out of tracked files and conversation.
Use the admission and browser skills when relevant.
Keep `planning-docs/architecture.md` consistent with the implementation.
Follow `planning-docs/privacy-and-cost.md` for free service limits and data handling.

Record the date, commands, outcomes, and limitations in `planning-docs/validation.md`.
Keep unperformed physical-device and deployment checks marked as not run or blocked.
Run `npm run ai:verify` after application implementation. Report failed or unavailable checks honestly.
At the phase boundary, provide review points, relevant manual checks, and a suggested commit message.
Stop for review. Do not commit, push, deploy, or start another phase without instruction.
