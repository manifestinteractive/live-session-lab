# Implementation plan

Deliver one authorized phase at a time, then stop for human review.
The application contains the Phase 1-3 capabilities below. Release acceptance remains subject to [Validation](validation.md).
Phase 4 has not started.

This plan describes the intended release. Use [Architecture](architecture.md) for decisions and the [developer guide](../docs/developers.md) for commands.

## Phase 1: Foundation

Dependency: approved scope and working AI scaffolding.

Agent scope: configure Next.js App Router, React, TypeScript, Tailwind CSS v4, and shadcn/ui in this repository.
Build the home page introduction, responsive join form, video stage, and footer. Keep component source and shared theme variables locally.
Add environment placeholders and real formatting, lint, type, unit, browser, and build checks.
Document local development in the developer guide. Do not add service credentials to tracked files.

Deliverables: application shell, component configuration, environment example, and repeatable checks.
Acceptance: the app runs locally, keyboard controls work, layouts fit the required sizes, and checks pass.
No media request occurs automatically when the page opens.

Human review: page layout, participant language, local development instructions, and check results. Stop for review.

## Phase 2: Working calls

Dependency: foundation acceptance and a configured free LiveKit project for real transport checks.

Agent scope: implement reusable host and guest codes, optional signed invitations, and protected token issuance.
Use two fixed identities per room and five-minute participant tokens. Reuse replaces the matching connection.
Validate authorization before provider operations. Retain the provider room limit as a secondary setting.

Implement preview, device selection, remote media, audio-only participation, and leave/rejoin.
Use SDK state for controls. Define track ownership during preview, joining, failure, and leave.

Deliverables: admission endpoint, invitation command, LiveKit integration, authorization tests, and media lifecycle checks.
Acceptance: invalid credentials and room substitution fail; token grants stay restricted; capture ends after leaving or a failed join.
Concurrent exchanges allocate only the two fixed identities. Reuse displaces only the matching participant, including after room recreation.
A Mac and iPhone communicate with real media. Mark missing device or credential checks as not run.

Human review: actual calls, admission behavior, the code-reuse tradeoff, and test evidence. Stop for review.

## Phase 3: Resilience and privacy

Dependency: working-call acceptance.

Agent scope: handle permission denial, input changes, failed requests, and SDK reconnection.
Device discovery can request temporary input permission after an explicit menu action. Stop temporary tracks after enumeration.
Cancel pending work safely, including capture that resolves after cancellation.

Complete responsive video overlays, participant placeholders, connection details, and joined-session fullscreen.
Keep device menus and leave confirmation usable in fullscreen. Confirmed leave must exit fullscreen and stop capture.
Keep credentials in memory and out of diagnostic output. Document provider processing separately from application storage.

Deliverables: recovery behavior, accessible controls, responsive layouts, privacy boundaries, and repeatable regression checks.
Acceptance: permission recovery, audio-only use, interruption recovery, and leave/rejoin pass.
Controls fit at 320, 390, 768, and 1440 pixels, with rotation and 200% text zoom.
Physical-device checks remain separate from browser automation. Known failures must remain visible in the validation record.

Human review: failure messages, mobile interaction, privacy wording, and remaining release checks. Stop for review.

## Phase 4: Public handoff

Dependency: human approval to begin Phase 4 and resolution of required application checks.

Agent scope: prepare precise hosting instructions, operator procedures, usage guidance, and final validation evidence.
Verify actual LiveKit Cloud Build and Vercel Hobby account plans, current limits, and the absence of paid add-ons.
Configure the intended HTTPS origin and server-only secrets only within the authorized hosting scope.
Document admission disablement, code rotation, active-room termination, and the five-minute token expiry window.

Deliverables: deployment instructions, reviewed operator procedures, release limitations, and final validation results.
Acceptance: full verification passes and the authorized deployment passes HTTPS and physical-device tests.
Include Wi-Fi and cellular calls, permission recovery, audio-only use, network interruption, fullscreen orientation, and leaving.
Do not claim untested Safari behavior or end-to-end encryption. Accept service loss when free allowances run out.

Human review: hosting configuration, public copy, data boundaries, operating limits, and actual device results.
Deployment requires explicit instruction. After validation, suggest a commit message and stop for review.
Do not commit, push, or deploy automatically.
