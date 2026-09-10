# Project brief

This is a tracked summary of the local `plan.md`. The local plan remains the detailed source when available.

Live Session Lab is Peter Schmalfeldt's independent experiment with AI-assisted development and WebRTC.
It supports human-to-human video through LiveKit Cloud.
Use Next.js App Router, React, TypeScript, and official LiveKit browser, React component, and server SDKs.
Keep the deployment path compatible with Vercel or an equivalent Next.js host.
Use calm styling, readable text, strong contrast, and responsive controls.
Do not add AI application features or a database. Exclude recording, transcription, analytics, and full user accounts.

## Phase boundaries

1. Foundation: runnable static pre-join and room shell, README, placeholder environment file, architecture diagram, and concise decision log.
   Clearly label disconnected demonstrations. Run relevant checks. Stop for review.
2. Real video: protected invitation exchange, pre-join preview, device selection, remote media, presence, controls, and leave/rejoin.
   Test authorization and capture cleanup. Validate two separate browser sessions with credentials. Stop for review.
3. Resilience: permission/device errors, audio-only use, SDK reconnection, accessibility, and supported diagnostics.
   Record a manual test matrix with actual results and untested cases. Stop for review.
4. Handoff: hosting instructions, invitation operations, smoke checks, abuse/cost controls, and honest validation records.
   Document shutdown, active-room termination, revocation limits, and resource removal. Wait for deployment instructions.

The participant opens an invitation, enters a display name, explicitly enables media, selects inputs, and joins.
Connection and media controls must reflect SDK state. Leaving or abandoning preview must release owned capture tracks.
Initially validate two participants. Do not claim tested group capacity.

## Admission contract

Use a local operator command and an established cryptographic library to create expiring, signed, room-scoped invitations.
Treat invitations as bearer credentials. Carry them in the URL fragment, then remove them from the visible URL.
Exchange them through a same-origin POST. Do not persist credentials in browser storage.
Validate invitation signature, expiry, origin, and room binding before issuing a LiveKit token.
Generate identities on the server. Issue short-lived tokens with ordinary participant permissions and disable response caching.
Reject expired or changed invitations and room substitution. Do not provide anonymous arbitrary-room token minting.
Admission expiry does not end an existing connection.
Keep secrets server-side. Never log credentials, invitation URLs, tokens, or display names.
Do not add third-party scripts that can read invitations.

## Evidence and delivery

Before each phase, state scope and acceptance criteria. Afterward, record actual results and limitations.
Provide review points, manual checks, and a concise suggested commit message. Stop until the user requests the next phase.
Never commit, push, or deploy without instruction. Do not invent test results or development metrics.
Missing credentials block live checks, not completion of integration code. Never simulate successful transport as proof.
Use test names. Explain that media uses LiveKit infrastructure without claims about retention, compliance, or end-to-end encryption.
Keep documentation proportional to this prototype. Use placeholder repository and deployment URLs until real URLs exist.
