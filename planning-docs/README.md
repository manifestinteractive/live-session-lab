# Live Session Lab development plan

Live Session Lab is an independent WebRTC experiment for private, two-person browser calls.
These documents define the complete project requirements and the human review process for AI-assisted development.

Status: Phase 4 local handoff preparation is complete. Public deployment and hosted acceptance remain pending.
The [validation record](validation.md) identifies verified behavior and outstanding release checks.

## Document index

| Document                                      | Purpose                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| [Architecture](architecture.md)               | System boundaries, admission, media ownership, and technology decisions.     |
| [Implementation plan](implementation-plan.md) | Delivery phases, dependencies, acceptance criteria, and human review points. |
| [Privacy and cost](privacy-and-cost.md)       | Data handling, provider limits, and operator controls.                       |
| [Validation](validation.md)                   | Required cases, actual evidence, and checks still needed.                    |

Use the [developer guide](../docs/developers.md) for commands and configuration.
Phase 4 procedures are in [Deployment](../docs/deployment.md) and [Operations](../docs/operations.md).
Use [AI development](../docs/ai-development.md) for Codex tools and skills.

## Product requirements

The home page introduces the project and contains the working call form. Calls require private credentials.
The public interface does not issue invitations or let anonymous visitors create rooms.

A reusable host code and a different guest code select two fixed places in one configured room.
Codes remain valid across server restarts until the operator changes them. Optional signed invitations expire.
Participants enter a temporary display name. Reusing a code or invitation replaces its existing connection.
Host and guest receive the same participant permissions. Strict rejection of every additional device is outside this demo.

Participants can preview devices, choose inputs, and join with video, audio only, or both inputs off.
Media controls reflect SDK state. The remote participant fills the main view; local video appears in an inset.
Joined sessions offer fullscreen with a 16:9 surface, black margins, and orientation support.
Device menus and connection details remain available inside the video stage.
Leaving requires confirmation, releases capture devices, and returns to a blank join form.

The interface must handle permission denial, failed joins, and temporary connection loss.
It must support keyboard operation, visible focus, usable touch targets, and enlarged text.
Validate Chrome and Safari on the Mac, plus Safari on a physical iPhone. Record untested cases explicitly.

## Stack and limits

Use Next.js App Router, React, TypeScript, shadcn/ui source, Tailwind CSS v4, and official LiveKit SDKs.
Use npm with the lockfile. Target LiveKit Cloud Build and Vercel Hobby free plans only.
Accept service loss at free limits. Verify account plans and current allowances before deployment.

Use test conversations only. Do not add a database, accounts, recording, transcription, analytics, or AI application features.
Chat, screen sharing, and file transfer are outside this release.

## AI development workflow

The human selects the work and reviews its acceptance criteria. The coding agent reads the relevant requirements before implementation.
Use official integration documentation and repository skills. Use review agents only when delegation is requested.

The agent runs automated checks and views actual screenshots through Playwright MCP for UI changes.
The human performs physical-device checks. Fake devices and mocked connections are separate evidence.

Record actual outcomes and limitations in [Validation](validation.md). Record design decisions in [Architecture](architecture.md).
At each phase boundary, provide review points and a suggested commit message, then stop for review.
Commit, push, and deploy only when instructed. Do not start another phase without authorization.
