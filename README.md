# Live Session Lab

An independent experiment with WebRTC and AI-assisted development.
The application implements private browser calls through the official LiveKit SDKs.
The demo uses two participant invitations with fixed identities and no database.
Phase 3 adds permission recovery, setup cancellation, device refresh, and SDK connection feedback.
Synthetic audio/video and invitation replacement passed. The user also reported successful desktop/iPhone streaming.
The remaining physical-device acceptance cases are pending.

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
Keep admission disabled until you are ready for controlled testing. See [Validation](planning-docs/validation.md) for current limitations.

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

The command reads `.env` and `.env.local`, with local values taking precedence, and outputs two labeled private URLs.
Give each participant a different URL. Reusing a URL replaces its current connection; the other participant stays connected.
Do not put invitation URLs in issues, screenshots, logs, or chat with coding agents.
The default validity is one hour. `npm run invite -- --minutes 15` creates a shorter invitation.
The supported validity is 1 to 1,440 minutes. Each command creates a random room unless an existing `lsl-UUID` is supplied with `--room`.
The command only signs invitations; it does not create a provider room or enable admission.
Earlier shared invitations are invalid. Run the command again to create participant-specific invitations.

### Test from a phone on the local network

Use the Mac and phone on the same local network. Phone capture requires trusted HTTPS.
Binding to `0.0.0.0` allows network access, but it is not an address to put in an invitation.
This setup uses [Next.js development HTTPS](https://nextjs.org/docs/app/api-reference/cli/next#using-https-during-development).
Install [mkcert](https://github.com/FiloSottile/mkcert) first if it is unavailable. Configure its local CA with `mkcert -install`.
That command changes the Mac's certificate trust settings. The repository's setup command does not install trust.

Replace `YOUR_LAN_IP` with the Mac's local IPv4 address:

```sh
npm run lan:setup -- YOUR_LAN_IP
```

The command creates ignored certificates under `.cache/lan/` and an ignored `.env.lan.local` file.
It preserves `.env.local`. Both LAN commands use the same HTTPS origin to keep invitation exchange valid.
An exported `APP_ORIGIN` takes precedence over these files; unset it when using this workflow.
Repeat setup and create new invitations if the Mac's IP address changes.

AirDrop only `.cache/lan/rootCA.cer` to the iPhone. Install its downloaded certificate profile in Settings.
Then enable it under Settings > General > About > Certificate Trust Settings.
See [Apple's certificate trust instructions](https://support.apple.com/en-us/102390).
Never share `server-key.pem` or `rootCA-key.pem`. Remove the test certificate profile when testing ends.

Stop any server on port 3000, then start controlled calls:

```sh
ADMISSION_ENABLED=true npm run dev:lan
```

In another terminal, create the private links:

```sh
npm run invite:lan
```

Open a different generated invitation on each device. Use the generated HTTPS address on the Mac too.
The server binds to `0.0.0.0:3000`. Allow Node through the Mac firewall if prompted for local network access.
Do not proceed through certificate warnings; install and trust the matching local CA first.
Local IP addresses cannot support a cellular-only test. This workflow does not deploy or open a public tunnel.
Stop the LAN server after testing. Regular `npm run dev` and `npm run invite` retain the original local configuration.

### Use the private call

Open the private link. Enter a test name and explicitly enable the camera or microphone you want to share.
Select an available input after permission is granted. Use Refresh device list after connecting an input.
Permission errors give a specific recovery action. You can keep the camera off for an audio-only call.
Cancel setup stops owned capture and resets the form while preserving the invitation. Close any unanswered browser permission prompt.
The browser cannot cancel that prompt for the application; a late capture result is stopped when it arrives. Join with both devices off if you only want to listen.
If audio playback is blocked, select Enable audio playback. Leave stops capture; rejoin requires an unexpired invitation.
Reloading clears the invitation. Reopen the original private link to return after a reload.
Connection details shows SDK connection quality, or Unavailable when no score is available.
LiveKit handles reconnection. Media can pause during recovery, and Leave remains available.
Invitation expiry prevents new admission. It does not end an existing connection.

The server issues only two stable identities per room, based on signed participant places.
Renewing an invitation or exchanging it concurrently cannot allocate another identity.
LiveKit replaces the existing connection when the same identity joins again. The interface explains this behavior.
The `maxParticipants: 2` setting remains secondary: live testing found that this setting alone did not enforce capacity.
This demo does not promise rejection of every additional device or uninterrupted device switching.

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
It uses synthetic media in isolated Chromium contexts and checks two identities, invitation replacement, capture cleanup, and rejoin after room deletion.
Use `npm run test:live -- --recovery` to also test audio-only media and SDK recovery after a signaling interruption.
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
