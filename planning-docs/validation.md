# Validation

This record separates application checks, provider tests, and physical-device reports.
Required cases are acceptance criteria, not claims that testing occurred. Phase 4 local handoff preparation is complete.
The user reported deployment and successful actual-device calls on 2026-09-11. Detailed hosted acceptance checks remain open below.

## Required checks

| Area                     | Acceptance cases                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Planning and scaffolding | Valid local links, agent references, skill metadata, configuration, scripts, and session-start context.                             |
| Admission                | Valid and invalid codes; signed invitation expiry and tampering; origin rejection; strict input shape; disabled admission.          |
| Token permissions        | Server-generated identities, room binding, five-minute expiry, restricted publication, and no caching.                              |
| Participant places       | Two identities under concurrent exchange; reuse replaces only its matching connection; room recreation retains the boundary.        |
| Media lifecycle          | Preview cleanup, failed joins, cancellation, late capture, mute state, leave/rejoin, and displaced-participant cleanup.             |
| Device menus             | Input selection while off, explicit permission discovery, refresh, denied access, and temporary-track cleanup.                      |
| Privacy                  | Fragment removal, no persistent credentials, no automatic capture, and sanitized diagnostic output.                                 |
| Fullscreen               | Available only after joining; 16:9 surface; black margins; orientation changes; accessible menus; confirmed leave exits fullscreen. |

Use `npm run ai:verify` for scaffolding, formatting, lint, types, unit tests, browser tests, and build.
Default checks use synthetic credentials and mocked provider operations. They consume no LiveKit allowance.
The command must fail when a required script is missing or a check fails.
See the [developer guide](../docs/developers.md#check-the-application) for optional provider tests.

For UI changes, use Playwright MCP and view actual screenshots.
Check 320, 390, 768, and 1440 pixels, landscape rotation, and 200% text zoom.
Check labels, keyboard order, visible focus, contrast, touch targets, status messages, and console errors.
Keep raw evidence under ignored `artifacts/`. Do not capture credentials or real participant details.

## Application verification

Verified on 2026-09-11 after the pre-release cleanup.

| Check                     | Actual result                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ai:verify`       | Passed scaffolding, formatting, lint, types, 81 unit tests, 100 browser tests, and production build.                             |
| Browser skip              | One native fullscreen case is Chromium-specific and intentionally skipped in WebKit. Fallback fullscreen passes in both engines. |
| Enlarged text             | Required checks pass without horizontal page overflow, including the hero at 200% text.                                          |
| Source audit              | No unreachable application modules or unused TypeScript declarations were found.                                                 |
| Documentation references  | Local file links, heading anchors, agent references, and session-start context pass.                                             |
| `npm run ai:shadcn:smoke` | Passed connection, discovery of 7 tools, and official button registry search.                                                    |

The production build exposes the home page and token endpoint, plus framework error and icon routes.
Browser checks cover code and signed-invitation admission, input menus, capture cleanup, and joined-session fullscreen.
Default verification uses synthetic or simulated participants and does not call the provider.

Playwright MCP captured and the agent viewed six final screenshots of the local production build.
They cover 320, 390, 768, and 1440 pixels, landscape, and 200% text at 320 pixels.
The heading, form text, and join button remain within their containers. No horizontal page overflow was measured.
The browser reported zero console errors or warnings. No device capture or provider connection was requested.
Raw screenshots remain in ignored `artifacts/playwright/cleanup-*.png`.

The session-start command returned matching context from the repository root and `docs/`.
Final formatting, lint, scaffolding, and whitespace checks passed after documentation updates.

## Phase 4 local handoff verification

Verified on 2026-09-11. Deployment and live operator checks were not performed.

| Check                       | Actual result                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ai:verify`         | Passed scaffolding, formatting, lint, types, 96 unit tests, 100 browser tests, and production build.                             |
| Browser skip                | One Chromium-only native fullscreen case remains intentionally skipped in WebKit.                                                |
| Room command tests          | 15 tests passed with mocked provider operations, including confirmation, selected-room deletion, status, and sanitized failures. |
| `npm run room -- --help`    | Passed without a provider request.                                                                                               |
| Documentation review        | Checked official LiveKit room APIs and quotas through its documentation MCP, plus official Vercel hosting documentation.         |
| Hosting and operator guides | Prepared in `docs/deployment.md` and `docs/operations.md`. Actual account settings and hosted behavior remain unverified.        |

These changes do not modify the application interface or fullscreen behavior.
No LiveKit room was inspected or terminated during this phase. No provider allowance was consumed by these checks.
At this local handoff, physical shutdown, hosted admission, and account confirmation remained release requirements.
The later hosted report below confirms successful Host and Guest connections.

## Join-field autofill checks

Verified on 2026-09-11 after changing invite entry to a text input and adding password-manager ignore hints.
`npm run ai:verify` passed scaffolding, formatting, lint, types, 96 unit tests, 100 browser tests, and production build.
The Chromium-only native fullscreen test remains intentionally skipped in WebKit.
Existing tests confirmed manual code entry, POST exchange, reload cleanup, and read-only codes supplied through links.

Playwright MCP confirmed autocomplete is off for both fields and both password-manager hints are present.
Keyboard entry enabled Join session. The agent viewed screenshots at 320, 390, 768, and 1440 pixels, landscape, and 200% text.
Focus remained visible, and no horizontal page overflow or console warnings/errors were observed.
Screenshots remain in ignored `artifacts/playwright/autofill-*.png`.

The isolated browser has no saved passwords or password-manager extensions.
Saved-password prompts and autofill behavior in the user's browser, including iPhone Safari, remain unverified.
Browsers and extensions can ignore page hints. No provider connection or physical-device check was performed.

## Web app manifest checks

Verified on 2026-09-11. The full verification passed scaffolding, formatting, lint, types, 96 unit tests, 100 browser tests, and build.
One Chromium-only native fullscreen case remains intentionally skipped in WebKit.
The final production build passed again after removing a duplicate metadata tag.

Playwright MCP verified the manifest link, its JSON content type, standalone display, and credential-free `/` launch configuration.
Chromium parsed the manifest without errors. Both PNG icons decoded at their declared 192 and 512 pixel sizes.
The 180 pixel Apple icon loaded, and the generated standalone metadata was present.
The installability check reported only `in-incognito` for the isolated MCP browser. No installation was performed.

The agent viewed the application icon and six page screenshots at the required widths, landscape, and 200% text.
No horizontal page overflow or console warnings/errors were observed. Screenshots remain in ignored `artifacts/playwright/manifest-*.png`.
Actual desktop installation and iPhone Home Screen launch, permissions, rotation, and calls remain unverified.
These checks used the local production build with admission disabled and did not connect to LiveKit.

## Scaffolding evidence

Recorded on 2026-09-10 with macOS arm64, Node.js 26.8.1, npm 11.19.0, and Codex CLI 0.153.4.
These results establish tooling behavior; they do not establish application transport.

| Check                         | Observed result                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run ai:check`            | Passed lockfile, configuration, skill, script, hook, and documentation checks.                      |
| Repository skill validation   | The bundled validator accepted all three repository-owned skills.                                   |
| Codex MCP configuration       | The Playwright launcher loaded and reported enabled.                                                |
| Session-start command         | Returned valid context JSON from both the repository root and `docs/`.                              |
| Documentation MCP connections | LiveKit Docs exposed 9 tools; OpenAI Docs exposed 5 tools.                                          |
| Playwright MCP smoke check    | Passed navigation, snapshot, button interaction, and screenshot capture. The screenshot was viewed. |
| shadcn MCP smoke check        | Passed connection, tool discovery, and official button registry search.                             |
| Verification guard            | Rejected missing application check scripts with a nonzero exit.                                     |
| Ignore and whitespace checks  | Passed. Browser evidence, caches, and dependencies stayed ignored.                                  |

The browser smoke check required approved local process access. No browser sandbox protections were disabled in repository configuration.
Native Codex hook activation and optional review-agent execution were not exercised.

## Provider tests with synthetic media

Recorded on 2026-09-10 against a user-confirmed free LiveKit Cloud Build project.
These tests used isolated Chromium contexts, temporary rooms, and synthetic media. They consumed provider allowance.

| Check                             | Observed result                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run test:codes`              | Passed two-person audio/video, host-code reuse, leave/rejoin, room deletion, and concurrent recreation.               |
| Code reuse                        | Displaced only the matching host connection and stopped its capture. The guest remained connected.                    |
| `npm run test:live -- --recovery` | Passed bidirectional video decoding, audio RTP receipt, media controls, audio-only calls, and SDK signaling recovery. |
| Cleanup                           | Browser contexts closed and no temporary provider room remained after the code test.                                  |
| Browser bundle inspection         | The 14 inspected production browser artifacts contained neither configured invite code.                               |

Provider testing did not establish enforcement by `maxParticipants: 2` alone. Two stable identities form the application boundary.
After room recreation, room-list metadata did not reliably show the expected configuration.
Administrative termination of a recreated active room still needs verification. Do not infer that a missing room-list entry proves termination.
A simulated signaling interruption does not establish Wi-Fi/cellular handoff or all media failures.
Provider checks have not been repeated for the pre-release cleanup.

## Physical-device evidence

The following results are user reports from 2026-09-10. The agent did not observe the devices.
Device models, OS versions, and browser versions were not supplied. The iPhone browser was not named.

| Case                                                     | Reported result                                |
| -------------------------------------------------------- | ---------------------------------------------- |
| Desktop and iPhone streaming over local HTTPS            | Both devices streamed without reported issues. |
| Microphone and camera controls, including audio-only use | Passed.                                        |
| Leave/rejoin and capture stopping on leave               | Passed.                                        |
| Camera permission denial followed by restored access     | Passed.                                        |
| Brief network interruption followed by reconnection      | Passed.                                        |
| Repeating call checks in Chrome and Safari on the Mac    | Passed.                                        |

On 2026-09-11, the user confirmed that enabling capture revealed the iOS device list.
Automatic permission discovery from a menu action still needs a physical iPhone check.
The current interface and code-link flow have not received a complete physical-device acceptance run.

## Hosted deployment and physical-device report

Reported by the user on 2026-09-11. The agent did not observe these tests.

| Case                | Reported result                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Deployment          | The site is deployed at [https://live-session-lab.vercel.app/](https://live-session-lab.vercel.app/). |
| Public access       | Visitors can view the general site. Joining calls requires a private invitation.                      |
| Invitation sharing  | The user keeps invitations private and shares them only with selected participants.                   |
| Actual-device calls | The user connected as both Host and Guest and reported that the call worked.                          |

Device models, OS versions, browser versions, and network types were not supplied for this hosted test.
This report does not establish results for the remaining acceptance cases below.
The user confirmed Vercel Hobby and LiveKit Cloud Build with no paid add-ons on 2026-09-11.

For this documentation update, `npm run format` passed.
`npm run ai:verify` passed scaffolding, formatting, lint, types, and 96 unit tests.
Browser tests could not start because an existing Next.js development server held the project lock. The build stage was not reached.

## Version 1.0.0 release preparation

Verified on 2026-09-11. Both package files declare version `1.0.0` and the MIT license.
The package retains `private: true` to prevent npm publication. This setting does not restrict the public repository or site.

After stopping the local development server, the sandboxed browser run hit file-watching errors and was stopped.
`npm run ai:verify` then passed with normal local process access: scaffolding, formatting, lint, types, 96 unit tests, 100 browser tests, and build.
One Chromium-only native fullscreen case remains intentionally skipped in WebKit.

Before this release deployment, the public HTTPS home page returned HTTP 200.
A synthetic invalid invitation returned HTTP 401 with `invalid_code` and `Cache-Control: no-store, private`.
These HTTP checks did not request media or use real invitations.
The current official LiveKit and Vercel documentation still describes free plans with usage limits.
The user confirmed both deployed accounts use those free plans with no paid add-ons.

## Release checks still needed

Record date, device, OS, browser version, network, and outcome for each physical run.
Use a Mac and a physical iPhone with headphones. Test Chrome and Safari on the Mac, plus Safari on the iPhone.

| Check                                                                                | Status                                                                                                                             |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Full verification after pre-release cleanup                                          | Passed on 2026-09-11, including Phase 4 local preparation.                                                                         |
| Installed app on iPhone and desktop                                                  | Not run. Check fresh launch, icons, permissions, rotation, and calls.                                                              |
| Current UI on physical iPhone Safari                                                 | Not run. Include input menus, permission discovery, and code links.                                                                |
| Fullscreen orientation and confirmed leave on physical devices                       | Not run. Include portrait and landscape.                                                                                           |
| Wi-Fi/cellular calls and network handoff                                             | Hosted calls reported; network types and handoff results not supplied.                                                             |
| Physical device switching, preview cancellation, and background/screen-lock recovery | Not run.                                                                                                                           |
| VoiceOver and manual contrast/focus review of the final interface                    | Not run. Automated accessibility scans provide separate coverage.                                                                  |
| Actual Vercel Hobby account and deployment configuration                             | Hobby and no paid add-ons confirmed by the user on 2026-09-11. Dashboard configuration remains unverified.                         |
| LiveKit Cloud Build account                                                          | Build and no paid add-ons confirmed by the user on 2026-09-11.                                                                     |
| Hosted HTTPS admission                                                               | Host and Guest connections passed by user report on 2026-09-11. A synthetic invalid invitation returned HTTP 401 on the same date. |
| Hosted active-room shutdown                                                          | Not run.                                                                                                                           |
| Native Codex hook activation and optional review agents                              | Not exercised. These are tooling checks, not call acceptance blockers.                                                             |

Do not claim release readiness until required checks pass and the human accepts the result.
