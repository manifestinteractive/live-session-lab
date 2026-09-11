# Developer guide

Use this guide to run, configure, and test Live Session Lab.
See [AI development](ai-development.md) for Codex tools and repository skills.
Use [Deployment](deployment.md) for Vercel hosting and [Operations](operations.md) for admission and room controls.
See [the development plan](../planning-docs/README.md) for requirements and review boundaries.

## Run locally

Use Node.js 22.12.0 or newer and npm. The implementation was checked with Node.js 26.8.1.

```sh
npm ci
npm run dev
```

Open [the home page](http://localhost:3000). Capture starts after an explicit media action. Opening or refreshing an input menu can request temporary permission to list devices.
Joining requires a host or guest invite code, or a signed invitation.

The stack uses Next.js App Router, React, TypeScript, shadcn/ui with Base UI, and Tailwind CSS v4.
Component source lives in `src/components/ui/`. Theme variables live in `src/app/globals.css`.
System fonts require no external font service.

## Installed web app

`src/app/manifest.ts` serves `/manifest.webmanifest`; Next.js adds its HTML link automatically.
The manifest uses standalone display with `/` as its identity, scope, and start URL. Orientation is not locked.
The launch URL never contains an invitation or participant name.
The PNG icons in `public/icons/` and `src/app/apple-icon.png` are raster versions of `src/app/icon.svg`.
The layout defines the browser theme color and Apple standalone metadata.

Installation uses the browser's own controls. See [the installation instructions](../README.md#install-the-app).
The app has no service worker or offline cache. Calls require network access, and admission responses remain uncached.
Use trusted HTTPS for device installation checks. Test launch, rotation, permissions, and leave/rejoin in the installed app.
Browser automation does not prove installation or capture behavior in an installed iPhone app.

## Configure private calls

Use a LiveKit Cloud Build project. Verify that the account uses the free plan before enabling calls.
Copy `.env.example` to ignored `.env.local`. Enter credentials locally, never in chat or a committed file.
Keep admission disabled until you are ready for controlled testing. See [Validation](../planning-docs/validation.md) for current limitations.

| Variable                                | Local configuration                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `LIVEKIT_URL`                           | The project's `wss://` URL.                                                                            |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | A key pair from the LiveKit project. These remain server-side.                                         |
| `HOST_INVITE_CODE`                      | A private random host code, 20-128 letters, digits, underscores, or hyphens.                           |
| `GUEST_INVITE_CODE`                     | A different private random guest code with the same format.                                            |
| `CALL_ROOM_NAME`                        | A fixed `lsl-UUID` room name. Preserve it across restarts and code changes.                            |
| `INVITATION_SIGNING_SECRET`             | Optional for signed links: a separate random secret with at least 32 bytes.                            |
| `APP_ORIGIN`                            | Exact application origin, without a trailing slash. Use `http://localhost:3000` for local Mac testing. |
| `ADMISSION_ENABLED`                     | Default to `false`. Set `true` only when configured and ready to admit participants.                   |

Restart the server after configuration changes. Server configuration and the address used to open invitations must match.
An iPhone requires an HTTPS address it trusts for capture. Local HTTP on the Mac's LAN address is insufficient.
Local certificate trust must be configured on each test device. Public deployment requires separate authorization.

Set the two codes once in `.env.local`, using different randomly generated values. Do not use short PINs or the words `host` and `guest`.
Set `CALL_ROOM_NAME` to `lsl-` followed by a UUID, for example `lsl-12345678-1234-4234-8234-123456789abc`.
Both people open the same home page address. Give the guest only `GUEST_INVITE_CODE`; keep `HOST_INVITE_CODE` for yourself.
You can also append `#invite=<code>` to the home page address, using the exact configured host or guest code.
The link fills the read-only code field. Enter a name and select Join session. The app removes the fragment after reading it.
Links use the same 20-128 character code requirements and server admission checks.
The code uses a text input with autocomplete disabled and password-manager ignore hints.
Browsers and extensions can ignore these hints. Verify saved-password behavior in the browsers you use.
[MDN autocomplete guidance](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Turning_off_form_autocompletion),
[1Password field hints](https://www.1password.dev/web/compatible-website-design).
Codes are case-sensitive. They have no automatic expiry and remain valid after a server restart.
Changing a code and restarting blocks future exchanges with the old code. Keep the room name unchanged to preserve participant places.
A reused code replaces its previous connection. Host and guest have the same media permissions; the host code is not an admin credential.
Codes stay on the server and in browser memory during use. Share code links privately. Never put codes in public files, URL paths, query strings, or logs.

### Optional expiring links

The CLI creates time-limited invitations:

```sh
npm run invite
```

The command reads `.env` and `.env.local`, with local values taking precedence, and outputs two labeled private URLs.
Give each participant a different URL. Reusing a URL replaces its current connection; the other participant stays connected.
Do not put invitation URLs in issues, screenshots, logs, or chat with coding agents.
The default validity is one hour. `npm run invite -- --minutes 15` creates a shorter invitation.
The supported validity is 1 to 1,440 minutes. Each command creates a random room unless an existing `lsl-UUID` is supplied with `--room`.
The command only signs invitations; it does not create a provider room or enable admission.

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
Repeat LAN setup if the Mac's IP address changes. Open the home page at the new HTTPS address; the same codes still work.

AirDrop only `.cache/lan/rootCA.cer` to the iPhone. Install its downloaded certificate profile in Settings.
Then enable it under Settings > General > About > Certificate Trust Settings.
See [Apple's certificate trust instructions](https://support.apple.com/en-us/102390).
Never share `server-key.pem` or `rootCA-key.pem`. Remove the test certificate profile when testing ends.

Stop any server on port 3000, then start controlled calls:

```sh
ADMISSION_ENABLED=true npm run dev:lan
```

Open `https://YOUR_LAN_IP:3000/` on both devices. Enter the host code on the Mac and the guest code on the phone.
Use `npm run invite:lan` only if you prefer optional expiring links.
The server binds to `0.0.0.0:3000`. Allow Node through the Mac firewall if prompted for local network access.
Do not proceed through certificate warnings; install and trust the matching local CA first.
Local IP addresses cannot support a cellular-only test. This workflow does not deploy or open a public tunnel.
Stop the LAN server after testing. Regular `npm run dev` and `npm run invite` retain the original local configuration.

### Use the private call

Open `/` and enter your invite code, or open an optional private link. Enter a test name and explicitly enable the camera or microphone you want to share.
The other participant fills the main video area. Your video appears in a small overlay at the top right.
Round microphone and camera controls sit over the video. The red phone button leaves the session.
Select the chevron beside either media control to open its device settings. Escape closes the popover.
Hover or use a screen reader for each control's action label. The controls also support keyboard operation.
The menu loads available inputs when opened. You can select a listed input while capture is off.
If device labels are unavailable, opening or refreshing the menu requests permission for that input type.
The app briefly captures that input to read the device list, then stops the temporary tracks.
This does not enable the preview or publish media. Permission denial appears in the menu.
Use Refresh device list after connecting an input. A failed refresh keeps the previous list and shows an error.
Permission errors give a specific recovery action. You can keep the camera off for an audio-only call.
Cancel request appears only while a request is pending. It stops owned capture while preserving access details for another attempt.
Close any unanswered browser permission prompt.
The browser cannot cancel that prompt for the application; a late capture result is stopped when it arrives. Join with both devices off if you only want to listen.
If audio playback is blocked, select Enable audio playback. Leave session opens a confirmation. Stay in call keeps the call active.
Leave call stops capture and returns to a blank join form. Enter your code and name again, or reopen a signed invitation.
Reloading clears the entered code or invitation from browser memory. Enter the same code again or reopen an unexpired private link.
The gear inside the private video frame opens Connection details. It shows SDK connection quality, or Unavailable when no score is available.
LiveKit handles reconnection. Media can pause during recovery, and Leave remains available.
Invitation expiry prevents new admission. It does not end an existing connection.

The server issues only two stable identities per room. Host and guest codes select those places; signed invitations can select them too.
Renewing an invitation or exchanging it concurrently cannot allocate another identity.
LiveKit replaces the existing connection when the same identity joins again. The interface explains this behavior.
The `maxParticipants: 2` setting remains secondary: live testing found that this setting alone did not enforce capacity.
This demo does not promise rejection of every additional device or uninterrupted device switching.

## Check the application

`npm run test:codes` is an opt-in live check on the configured free LiveKit project. Run `npm run build` first.
It starts an isolated local server on port 3200 with temporary codes and a temporary room, then verifies synthetic media and code reuse.
It consumes provider allowance. It does not use or change the normal host/guest codes or shared demo room.
The check closes its browser, deletes its test room, and stops its local server.

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
Add `--layout` to check the video overlay at all four required widths and capture enlarged-text and landscape evidence.
It writes sanitized results and synthetic screenshots under ignored `artifacts/`. Stop the enabled server after testing.

## Formatting, hooks, and CI

Run `npm run format` to format code and sort Tailwind classes. Use `npm run format:check` to check without changes.
ESLint is already configured for Next.js and TypeScript. Use `npm run lint:fix` for available automatic code fixes.
The repository recommends Prettier and ESLint editor extensions and enables format on save when those extensions are installed.
AI agents follow the formatting workflow in `AGENTS.md`; `ai:verify` requires formatting and lint checks to pass.
`npm ci` installs a pre-commit hook that formats and lints staged files.
GitHub Actions runs the full checks on pull requests and pushes to `main`, including merges.
The [CI workflow](../.github/workflows/ci.yml) uses Node.js 24 on Ubuntu 24.04 and installs Chromium and WebKit.
It uses read-only repository permissions and no application secrets. It runs checks only; it does not deploy.
A repository administrator must require the `Validate` check in branch protection to block failed merges.
GitHub Actions usage remains subject to the repository's allowance and billing settings.

The hook uses lint-staged to protect unstaged changes while it fixes staged files. Review its changes before pushing.
Run `npm run prepare` to reinstall the hook. CI and production installs skip hook registration.
Do not bypass hooks or suppress lint errors to finish an agent task.
Prettier excludes secrets, generated output, upstream skills, and license copies. npm maintains the lockfile.

Run individual checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, or `npm run build`.
Use `npm start` after a successful build to inspect the production build locally.
Raw evidence stays in ignored `artifacts/`. Invitation-bearing browser tests disable traces and video recording.

## Operating limits

The intended hosting uses LiveKit Cloud Build and Vercel Hobby free plans.
Verify account plans and current limits before deployment. Accept temporary service loss at free limits.
Public deployment is pending Phase 4. Verify the selected account plans before enabling hosted admission.
Use `npm run room -- status` to inspect the configured room without printing participant details.
Use `npm run room -- close --confirm` only when you intend to disconnect that room's participants.
Follow [the shutdown procedure](operations.md#stop-admission-and-end-calls) to disable admission and handle issued tokens and older deployments.
See [Privacy and cost](../planning-docs/privacy-and-cost.md) for data boundaries and operator limitations.

## Repository map

| Path                              | Responsibility                                                       |
| --------------------------------- | -------------------------------------------------------------------- |
| `src/app/`                        | Home page, global styles, metadata, and token route.                 |
| `src/components/private-call.tsx` | Admission form, device menus, and call presentation.                 |
| `src/lib/call-session.ts`         | LiveKit connection and local track ownership.                        |
| `src/lib/server/`                 | Code validation, signed invitations, and participant token issuance. |
| `src/components/ui/`              | Repository-owned shadcn/ui component source.                         |
| `scripts/`                        | Local network setup, invitations, checks, and AI tooling.            |
| `tests/`                          | Unit tests and repeatable browser checks.                            |
| `planning-docs/`                  | Requirements, decisions, release acceptance, and evidence.           |

Image attribution is in [Image sources](image-sources.md). Keep raw test evidence under ignored `artifacts/`.
