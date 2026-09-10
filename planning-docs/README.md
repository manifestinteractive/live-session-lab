# Live Session Lab development plan

Status: planning complete; application development has not started.
Plan date: 2026-09-10.

Live Session Lab is Peter Schmalfeldt's independent experiment with WebRTC and AI-assisted development.
The goal is a working browser prototype that others can inspect, run locally, and try through private invitations.
These documents define the complete project requirements.

## Reading order

| Document | Purpose |
| --- | --- |
| [Architecture](architecture.md) | System boundaries, admission flow, interfaces, and technology decisions. |
| [Implementation plan](implementation-plan.md) | Ordered work, phase acceptance criteria, and human review points. |
| [Privacy and cost](privacy-and-cost.md) | Data handling, free limits, and operator controls. |
| [Validation](validation.md) | Automated checks, physical-device tests, and actual results. |

See [AI development setup](../docs/ai-development.md) for the installed development tools and their earlier validation results.

## Product scope

The first release supports two people in a private room. The public introduction page explains the experiment and invitation requirement.
It does not let anonymous visitors create rooms or issue their own invitations.

A participant opens an invitation and enters a temporary display name.
They explicitly enable camera or microphone, preview media, select available inputs, and join.
They can see participant presence, control their own media, leave, and rejoin while admission remains valid.
Audio-only participation is supported. Capture devices must stop when the participant leaves or abandons preview.

Use simple participant-facing language and a collapsed Connection details panel for technical status.
Show empty, loading, connecting, reconnecting, disconnected, and error states from real SDK information.
Static demonstrations must say they are disconnected. Never present simulated video as a working call.

Use calm, neutral styling with readable text, strong contrast, visible focus, and responsive controls.
Validate Chrome and Safari on a Mac, plus Safari on a physical iPhone.
Record other browsers as untested until actual checks occur. Do not claim broader capacity or browser coverage.

## Stack and exclusions

| Area | Requirement |
| --- | --- |
| Application | Next.js App Router, React, and TypeScript. |
| Interface | shadcn/ui component source in the repository; Tailwind CSS v4 and shared theme variables. |
| Media | Official LiveKit browser, React component, and server SDKs; LiveKit Cloud Build. |
| Hosting | Vercel Hobby for the personal, non-commercial demo. |
| Packages | npm with the existing lockfile; verify compatible versions before installation. |

AI assistance is part of development, not an application feature.
Do not add a database, user accounts, recording, transcription, analytics, or an AI voice agent.
Screen sharing, chat, and file transfer are outside the first release.
Use test conversations only. Do not design this release for sensitive real-world use.

## AI development workflow

The human selects a phase and reviews its acceptance criteria before the coding agent starts.
The coding agent reads the relevant requirements, checks official integration documentation, and implements one coherent increment.
Use repository skills for the relevant work. Use optional review agents only when delegation is requested.
Give review agents bounded tasks and coordinate exclusive access to the shared browser.

Run automated checks and inspect the rendered interface through Playwright MCP.
The agent must view screenshots. Saving a screenshot alone does not establish visual inspection.
The human performs physical-device checks that the agent cannot complete and records actual outcomes.

At each phase boundary, record commands, results, limitations, and review points in [Validation](validation.md).
Suggest a concise commit message and stop. Do not start another phase without instruction.
Commit, push, and deploy only when instructed. Never invent test results, development times, or human review history.

Update architecture decisions when requirements change. Keep planned behavior separate from implemented behavior and observed results.
