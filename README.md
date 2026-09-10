# Live Session Lab

An independent experiment with WebRTC and AI-assisted development.
The application implements private browser calls through the official LiveKit SDKs.
Phase 2 is incomplete: LiveKit admitted three participants despite a configured limit of two.
Synthetic audio/video transport passed. Physical Mac/iPhone acceptance remains unverified.

The public introduction and room preview remain disconnected demonstrations.
Private invitations open `/call`, where participants can preview devices and request admission.
Use made-up display names and test conversations only. Keep sensitive information out of the demo.

## Run locally

Use Node.js 22.12.0 or newer and npm. The implementation was checked with Node.js 26.8.1.

```sh
npm ci
npm run dev
```

Open [the setup preview](http://localhost:3000) or [the room preview](http://localhost:3000/room).
These public pages need no credentials and do not capture media.

The stack uses Next.js App Router, React, TypeScript, shadcn/ui with Base UI, and Tailwind CSS v4.
Component source lives in `src/components/ui/`. Theme variables live in `src/app/globals.css`.
System fonts require no external font service.

## Configure private calls

Use a LiveKit Cloud Build project. Verify that the account uses the free plan before enabling calls.
Copy `.env.example` to ignored `.env.local`. Enter credentials locally, never in chat or a committed file.
Keep admission disabled for external use until the capacity failure in [Validation](planning-docs/validation.md) is resolved.

| Variable | Local configuration |
| --- | --- |
| `LIVEKIT_URL` | The project's `wss://` URL. |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | A key pair from the LiveKit project. These remain server-side. |
| `INVITATION_SIGNING_SECRET` | A separate cryptographically random secret with at least 32 bytes. |
| `APP_ORIGIN` | Exact application origin, without a trailing slash. Use `http://localhost:3000` for local Mac testing. |
| `ADMISSION_ENABLED` | Keep `false` for external use. A local process override can enable controlled validation. |

Restart the server after configuration changes. Server configuration and the address used to open invitations must match.
An iPhone requires an HTTPS address it trusts for capture. Local HTTP on the Mac's LAN address is insufficient.
Deployment and local certificate trust changes require separate setup; this increment does not deploy the application.

Create an invitation from the repository root:

```sh
npm run invite
```

The command reads `.env` and `.env.local`, with local values taking precedence, and outputs a private URL. Share that URL with the two test participants.
Do not put invitation URLs in issues, screenshots, logs, or chat with coding agents.
The default validity is one hour. `npm run invite -- --minutes 15` creates a shorter invitation.
The supported validity is 1 to 1,440 minutes. Each command creates a random room unless an existing `lsl-UUID` is supplied with `--room`.
The command only signs invitations; it does not create a provider room or enable admission.

Open the private link. Enter a test name and explicitly enable the camera or microphone you want to share.
Select an available input after permission is granted. Join with both devices off if you only want to listen.
If audio playback is blocked, select Enable audio playback. Leave stops capture; rejoin requires an unexpired invitation.
Reloading clears the invitation. Reopen the original private link to return after a reload.
Invitation expiry prevents new admission. It does not end an existing connection.

The server requests `maxParticipants: 2` during room creation and in each token.
Live testing on 2026-09-10 found three connected participants while the provider reported that limit.
The limit is not established. The application must not be presented as an enforced two-person room.

## Check the application

```sh
npm run test:browser:install
npm run ai:verify
```

Stop the development server before verification. The browser suite starts its own server on port 3100 with admission disabled.
Unit tests mock provider administration and use synthetic secrets. The default verification command does not consume LiveKit Cloud resources.
Chromium synthetic devices test capture cleanup. WebKit tests cover layout and browser behavior.
These tests do not prove communication between physical devices.

`npm run test:live` is an optional provider test, excluded from `ai:verify`.
It needs the configured local application running with admission enabled and consumes the project's free allowance.
For controlled local validation, start `ADMISSION_ENABLED=true npm start` after building. Keep `.env.local` disabled.
Confirm the free account plan before this test. It creates a temporary room and attempts cleanup in `finally`.
It uses synthetic media in isolated Chromium contexts and returns failure if a third participant enters.
It writes sanitized results and synthetic screenshots under ignored `artifacts/`. Stop the enabled server after testing.

Run individual checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, or `npm run build`.
Use `npm start` after a successful build to inspect the production build locally.
Raw evidence stays in ignored `artifacts/`. Invitation-bearing browser tests disable traces and video recording.

## Operating limits

The intended hosting uses LiveKit Cloud Build and Vercel Hobby free plans.
Verify account plans and current limits before deployment. Accept temporary service loss at free limits.
No service has been provisioned or deployed by this increment.
Set `ADMISSION_ENABLED=false` and restart or redeploy to block new token issuance.
Existing calls continue. End them through the LiveKit room administration API when needed.
The documented `lk room delete <room-name>` command also disconnects participants when the LiveKit CLI is configured.
Already issued tokens can admit participants until their five-minute expiry; disabling the endpoint does not revoke them.
See [Privacy and cost](planning-docs/privacy-and-cost.md) for data boundaries and operator limitations.

## Planning and AI development

- [Development plan](planning-docs/README.md): complete requirements and phase boundaries.
- [Architecture](planning-docs/architecture.md): implementation, target system, and decisions.
- [Validation](planning-docs/validation.md): actual checks, limitations, and human review.
- [AI development setup](docs/ai-development.md): Codex skills and MCP tools.

The human selects a phase. The coding agent implements that phase, runs checks, and inspects screenshots through Playwright MCP.
The human reviews the result before the next phase. Commit, push, and deployment require a separate instruction.
