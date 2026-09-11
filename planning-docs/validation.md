# Validation

This record separates application checks, provider tests, and physical-device reports.
Required cases are acceptance criteria, not claims that testing occurred. Phase 4 has not started.

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

## Release checks still needed

Record date, device, OS, browser version, network, and outcome for each physical run.
Use a Mac and a physical iPhone with headphones. Test Chrome and Safari on the Mac, plus Safari on the iPhone.

| Check                                                                                | Status                                                                 |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Full verification after pre-release cleanup                                          | Pending.                                                               |
| Current UI on physical iPhone Safari                                                 | Not run. Include input menus, permission discovery, and code links.    |
| Fullscreen orientation and confirmed leave on physical devices                       | Not run. Include portrait and landscape.                               |
| Wi-Fi/cellular calls and network handoff                                             | Not run. A local IP cannot support cellular-only access.               |
| Physical device switching, preview cancellation, and background/screen-lock recovery | Not run.                                                               |
| VoiceOver and manual contrast/focus review of the final interface                    | Not run. Automated accessibility scans provide separate coverage.      |
| Actual Vercel Hobby account and deployment configuration                             | Not verified.                                                          |
| LiveKit Cloud Build account                                                          | Confirmed by the user on 2026-09-10. Recheck before deployment.        |
| Hosted HTTPS admission and active-room shutdown                                      | Not run. No public deployment is recorded.                             |
| Native Codex hook activation and optional review agents                              | Not exercised. These are tooling checks, not call acceptance blockers. |

Do not claim release readiness until required checks pass and the human accepts the result.
