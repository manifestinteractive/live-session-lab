# Implementation plan

Phase 2 code received human acceptance and was committed. Phase 3 implements resilience and privacy.
The user reported successful desktop/iPhone streaming. Remaining physical-device checks and Phase 3 human review are pending.
Phase 4 is unstarted.
Complete one requested phase, then stop for human review.
Use [Architecture](architecture.md) for interfaces and [Validation](validation.md) for evidence requirements.

## Phase 1: Foundation

Dependency: the public plan and AI scaffolding are available.

The coding agent will add Next.js App Router with React and TypeScript to the existing repository.
Configure Tailwind CSS v4 and shadcn/ui with shared theme variables. Keep only required component source and dependencies.
Use calm styling and responsive layouts for the public introduction, pre-join shell, and room shell.
Show explicit disconnected demonstration labels. Do not request camera access or imply that a static screen sends media.

Update the root README with scope, local setup, and links to the architecture.
Add `.env.example` with placeholders for the LiveKit URL, API credentials, invitation signing secret, and application origin.
Document an admission-enabled setting that defaults to disabled until configuration is complete.
Document local secret entry without requesting secrets in chat.

Add real `lint`, `typecheck`, `test`, `test:e2e`, and `build` scripts to the existing npm package.
Use ESLint and TypeScript checks, Vitest for focused component tests, and Playwright for browser tests.
Choose compatible versions from current official documentation and retain the lockfile.
Keep application tests separate from the existing browser tooling fixture.

Acceptance: the application runs locally, shell tests pass, and `npm run ai:verify` passes.
Inspect screenshots at the required widths. Confirm keyboard access and accurate disconnected labels.
Human review: visual layout, participant language, static scope, and setup instructions. Stop for review.

## Phase 2: Working calls

Dependency: human acceptance of Phase 1. Configured credentials are required for real call validation.

Implement the local invitation command and protected token endpoint from the architecture.
Use two different one-hour invitations and five-minute LiveKit tokens. Each invitation specifies one of two signed participant places.
Derive a stable identity for each room and place. Reuse replaces that identity's connection and must stop capture on the displaced device.
Retain the provider room limit as a secondary setting. Do not depend on it as the sole admission boundary.
Test authorization before enabling admission for external use.

Implement explicit camera/microphone preview, available input selection, and joining with the selected media state.
Show remote audio/video and participant presence. Implement camera/microphone controls and leave/rejoin.
Use LiveKit state for indicators and define track ownership during preview, join, failure, and leave.

Acceptance: authorization and media lifecycle tests pass; a Mac and iPhone can communicate with configured credentials.
Leaving and abandoning preview release capture devices. Invalid participant places and client-selected identities are rejected.
Concurrent exchanges issue at most two identities. Invitation reuse replaces its connection, including after room recreation.
Strict rejection of an additional device is outside this demo. Do not describe replacement as rejection.
If credentials or a second device are unavailable, finish testable integration code and mark live acceptance as blocked.
Do not simulate live acceptance or mark the phase validated without that evidence.
Human review: real audio/video, explicit permission behavior, and invitation workflow. Stop for review.

## Phase 3: Resilience and privacy

Dependency: human acceptance of Phase 2.

Handle permission denial or dismissal, missing inputs, removed devices, and failed connections.
Support audio-only calls. Use SDK reconnection and show bounded recovery actions.
Handle remote departure, browser playback restrictions, and recovery after an interrupted call.

Complete keyboard operation, focus handling, accurate toggle names/states, and status announcements.
Check mobile rotation, text zoom, and controls with usable touch targets.
The collapsed Connection details panel may show SDK connection state, participant count, track status, and available connection quality.
Mark missing diagnostics as unavailable. Do not invent network measurements or expose credentials.

Apply the data handling rules in [Privacy and cost](privacy-and-cost.md).
Check request handling and browser storage with synthetic inputs. Review logs and evidence for sensitive data.

Acceptance: relevant automated tests pass and required recovery, privacy, and physical-device cases have recorded outcomes.
Document limitations, including mobile background behavior and device controls that a browser does not support.
Human review: Mac/iPhone failure recovery, keyboard use, and privacy language. Stop for review.

## Phase 4: Public handoff

Dependency: human acceptance of Phase 3. Actual deployment requires a separate instruction.

Prepare exact Vercel Hobby and LiveKit Build setup instructions, including HTTPS and server environment configuration.
Verify the actual account plans and current free limits. Do not select a paid trial, upgrade, or paid add-on.
Document private invitation sharing, usage inspection, admission shutdown, active-room termination, and resource removal.
Include a concise guide for trying the demo with a supplied invitation and two devices.
Use placeholder repository and deployment URLs until actual URLs are known.

Run lint, type checks, focused tests, browser tests, and a production build.
Prepare deployment smoke checks before asking for deployment approval. After an authorized deployment, run the HTTPS and physical-device checks.
If deployment is not authorized, record the deployed checks as not run. Do not mark deployed acceptance complete.

Acceptance: an authorized deployment passes the required smoke checks and the public documentation states actual validation and limits.
Explain which behavior LiveKit provides and which behavior this application implements.
Describe actual AI assistance and human review without fabricated metrics or unsupported production claims.
Human review: public instructions, functional private demo, cost settings, and validation record. Stop for review.

## Phase handoff

Record the date, changed behavior, commands, actual outcomes, and remaining limitations in [Validation](validation.md).
Provide concise review points and manual checks. Suggest a commit message appropriate to the completed increment.
Do not commit, push, deploy, or start another phase without instruction.
