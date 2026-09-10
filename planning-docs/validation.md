# Validation

Status: Phase 2 code received human acceptance and was committed. Phase 3 resilience and privacy are implemented.
The user reported successful desktop/iPhone streaming. Remaining physical-device checks and Phase 3 human review are pending.
Phase 4 is unstarted.
Planned cases below are not test results.

## Automated checks

| Layer                    | Required cases                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning and scaffolding | Local documentation links, agent references, configuration and skill metadata, script syntax, and session-start context.                       |
| Phase 1 shell            | Introduction and invitation requirement, disconnected labels, accessible controls, and responsive layout.                                      |
| Admission                | Valid, missing, malformed, expired, and tampered invitations; disallowed origin; invalid display input; room substitution; disabled admission. |
| Token permissions        | Server-generated identity, validated room binding, five-minute expiry, ordinary participant grants, and non-cacheable responses.               |
| Capacity                 | Reject invalid signed places; concurrent exchanges issue two identities; invitation reuse replaces its connection and stops capture, including after recreation.                         |
| Media lifecycle          | Preview cancellation, failed join, component unmount, duplicate capture prevention, mute state, leave, and rejoin.                             |
| Recovery and privacy     | Permission errors, unavailable inputs, provider/quota errors, no persistent credentials, and sanitized application diagnostics.                |

Use Vitest for focused unit/component checks and Playwright for repeatable browser behavior.
Use synthetic signing secrets. Unit tests must not consume LiveKit Cloud resources.
Mocks can validate application behavior but cannot establish provider enforcement or real media transport.

Run `npm run ai:verify` for scaffolding, lint, type checks, tests, browser tests, and production build.
The command fails if a required check fails or an application script is missing.
The browser tooling fixture is not an application test.

## Visual and accessibility checks

Use Playwright MCP to inspect accessibility snapshots and actual screenshots. View every image used as evidence.
Inspect 320, 390, 768, and 1440 pixel widths. Check rotation and 200% text zoom for clipped controls or horizontal overflow.
Check control labels, tab order, visible focus, toggle states, and status announcements.
Check contrast and usable touch targets after shadcn/ui customization. A component library alone does not prove accessibility.
Inspect console errors and failed requests without capturing credential-bearing payloads.

## Physical-device matrix

Required equipment: a Mac and a physical iPhone, with headphones for two-device calls.
Record actual device models, OS versions, browser versions, network arrangement, and dates when testing.

| Scenario                  | Required coverage                                                                        | Status  |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| Initial physical streaming | Desktop and physical iPhone, as reported by the user.                                  | Passed, user report |
| Two-way audio/video       | Mac Chrome + iPhone Safari; Mac Safari + iPhone Safari.                                  | Not run |
| Different networks        | Mac on Wi-Fi and iPhone on cellular, when available.                                     | Not run |
| Pre-join and cleanup      | Preview, cancel, join, leave, and verify capture indicators stop.                        | Not run |
| Permissions               | Deny or dismiss access, then recover on each target browser.                             | Not run |
| Audio-only                | Join without video and confirm mutual audio.                                             | Not run |
| Device changes            | Change inputs on the Mac; test iPhone input controls only where supported.               | Not run |
| Network interruption      | Interrupt a connection and verify SDK recovery or a useful recovery action.              | Not run |
| Participant lifecycle     | Remote departure and leave/rejoin while admission remains valid.                         | Not run |
| Playback and mobile state | Audio activation, phone rotation, background/foreground, and recovery after screen lock. | Not run |
| Accessibility             | Mac keyboard operation and VoiceOver checks; iPhone touch and VoiceOver checks.          | Not run |
| Deployment                | HTTPS, private admission, cross-device call, unavailable state, and operator shutdown.   | Not run |

Android, Windows, Firefox, and physical tablets remain untested until actual checks occur.
Viewport emulation is not physical-device validation. Playwright WebKit is not proof of Safari or iOS behavior.
Fake devices do not establish real microphone, speaker, or camera behavior.

## Recording results

For each phase, record the date, code revision when available, commands, outcomes, and limitations.
Use Passed, Failed, Blocked, or Not run. Describe blockers without turning them into successful acceptance.
Keep automated, visual, and physical-device results separate. Record human review only after it occurs.
Public evidence must use synthetic data. Keep raw screenshots and traces in ignored `artifacts/`.

## Actual results

### Initial scaffolding: 2026-09-10

The [existing scaffolding record](../docs/ai-development.md#validation-record) preserves the actual checks and their environment.
It includes the MCP tooling fixture and screenshot inspection. It does not validate the application or a LiveKit call.

### Public planning: 2026-09-10

| Check                    | Actual result                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ai:check`       | Passed after adding planning links, agent references, and startup context checks.                                                     |
| Skill-creator validation | Passed for phase-delivery, livekit-admission, and browser-validation.                                                                 |
| Isolated public copy     | Passed with public documentation and scaffolding copied into a temporary directory. Installed dependencies were shared for the check. |
| Missing-document check   | Removing the architecture document from the temporary copy caused validation to fail, as expected.                                    |
| Session-start context    | The configured command returned the new planning index when run from the repository's docs directory.                                 |
| Public reference review  | Agent instructions and documentation use the new planning index. The replaced project brief has no remaining references.              |
| `git diff --check`       | Passed.                                                                                                                               |

These checks validate planning and scaffolding changes only. Browser tooling and package dependencies did not change in this update.
The earlier MCP and screenshot results remain in the initial scaffolding record; they were not rerun for documentation changes.
The session-start script ran directly for validation. Native hook activation and optional agent spawning were not exercised.

### shadcn scaffolding: 2026-09-10

| Check                     | Actual result                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned CLI                | Installed `shadcn` 4.21.0; the CLI version command returned 4.21.0. npm reported zero known vulnerabilities for 320 audited packages.   |
| Official skill source     | All 15 files match upstream commit `3ba91b1cc83e1bbe4ab35a422ff2a694849c5048`; skill metadata parses. The upstream license is retained. |
| Codex MCP configuration   | `codex mcp get shadcn --json` reported the local command with `enabled: true`.                                                          |
| `npm run ai:shadcn:smoke` | Passed connection, discovery of seven tools, and a search returning the official button component.                                      |
| `npm run ai:check`        | Passed, including the new MCP configuration, skill presence, and supporting document links.                                             |
| `git diff --check`        | Passed.                                                                                                                                 |

The upstream MCP search response has a defect in generated add-command fields.
The [setup documentation](../docs/ai-development.md#shadcnui-setup) describes the pinned CLI workflow used for component changes.
The check did not initialize `components.json` or install application components. Component installation remains untested until Phase 1.
MCP access was verified through a client script. A new Codex session must load the updated MCP configuration.

### Phase 1 foundation: 2026-09-10

Revision: uncommitted Phase 1 work following the scaffolding baseline.
Environment: macOS arm64, Node.js 26.8.1, npm 11.19.0.
Implemented `/` and `/room` with explicit disconnected demonstrations. No admission or media service exists.
Architecture choices remain in the separate [decision record](architecture.md#decision-record).

#### Automated results

| Check | Actual result |
| --- | --- |
| Dependency installation | Passed. npm reported zero known vulnerabilities for 695 audited lockfile packages. |
| shadcn initialization | Passed using pinned CLI 4.21.0 and official components. `info --json` detected Next.js, Tailwind v4, and the Base UI preset. |
| `npm run ai:verify` | Passed all required commands. |
| `npm run lint` | Passed with no errors or warnings after correcting the PostCSS export. |
| `npm run typecheck` | Passed route generation and TypeScript checks. |
| `npm test` | Passed 3 focused component tests. |
| `npm run test:e2e` | Passed 22 tests: 11 each in Chromium and WebKit with Playwright Test 1.63.0. |
| Automated accessibility | Passed axe scans on both routes at 320, 390, 768, and 1440 pixels in both browser engines. No reported violations for the selected WCAG A/AA rule tags. |
| Keyboard and layout | Passed skip navigation, name entry, room navigation, diagnostic disclosure, visible input outline, and 44-pixel minimum heights for visible enabled targets. |
| Rotation and text scaling | Passed overflow checks at 844x390 and at 390 pixels with the root font size set to 200%. This does not establish physical rotation or native browser zoom behavior. |
| Static privacy boundary | Passed browser checks for no capture/device-enumeration calls, no name submission, no external resource requests, and empty application storage/cookies. Name input cleared on exit and reload. |
| `npm run build` | Passed. Both pages and the application icon were generated as static content. Rebuilt after adding the missing icon. |
| `npm run ai:mcp:smoke` | Passed after updating browser package resolution. The tooling fixture screenshot was viewed. |
| `git diff --check` | Passed. |

The first browser run found a focus outline overridden by component utilities. The global focus rule now takes precedence.
The touch-target check incorrectly counted the hidden skip link; visible targets are now checked separately from keyboard skip navigation.
The WebKit keyboard test uses Option+Tab on macOS to include links, consistent with [Apple's keyboard documentation](https://help.apple.com/safari/mac/8.0/en.lproj/cpsh003.html).
The corrected suite passed. Browser launches required approved local process access in the restricted environment.

#### Playwright MCP visual results

Passed on the local production build served with `npm start`.
The configured Playwright MCP server was called through an MCP client script in this session.
All 15 application screenshots below were captured and viewed. Raw evidence stays in ignored `artifacts/playwright/`.

| Evidence | Actual observation |
| --- | --- |
| `setup-320.png`, `setup-390.png`, `setup-768.png`, `setup-1440.png` | Setup changes from stacked panels to two columns. Labels, notice text, and navigation remain readable. |
| `room-320.png`, `room-390.png`, `room-768.png`, `room-1440.png` | Participant placeholders stack on narrow screens. The disconnected notice and exit action remain visible. |
| `setup-landscape.png`, `room-landscape.png` | Both layouts remain usable at 844x390 with vertical scrolling. |
| `setup-text-200.png`, `room-text-200.png` | Text reflows without horizontal page overflow. Native input and disabled select text can truncate within their controls. Labels and help text remain outside the controls. |
| `skip-focus.png`, `input-focus.png`, `room-details.png` | Skip navigation and input focus are visible. Connection details opens and reports no SDK connection. |

Production inspection initially found a missing browser icon request. Added `src/app/icon.svg` and rebuilt.
The final MCP session reported zero console errors or warnings. Inspected requests returned 200 and stayed on the local origin.
The interface uses disabled styling for unavailable controls. Automated scans do not certify accessibility or screen-reader behavior.

#### Human review and unperformed checks

Human acceptance: pending. Review the visual layout, participant wording, and disconnected scope.
Check the local setup instructions and inspect the pages in Mac Chrome and Safari.
Physical iPhone layout, touch, rotation, and VoiceOver checks remain Not run.
No physical-device media, HTTPS deployment, Wi-Fi/cellular call, or provider quota check ran in Phase 1.
The physical-device matrix above remains unchanged. Live calls are outside this phase.

Suggested commit message: `feat: add the Phase 1 interface foundation`.
No commit, push, or deployment occurred. Stop here until Phase 1 receives human review.

### Phase 1 human review: 2026-09-10

The user accepted Phase 1 and instructed the coding agent to continue.
This records acceptance of the interface increment. It does not replace the unperformed physical-device checks above.

### Phase 2 private call integration: 2026-09-10

Revision: uncommitted Phase 2 work after the committed Phase 1 foundation.
Environment: macOS arm64, Node.js 26.8.1, npm 11.19.0.
The user supplied credentials in ignored `.env.local` and confirmed that the LiveKit project uses the free plan.
The coding agent did not change the account plan or the credential file.

#### Repeatable automated checks

| Check | Actual result |
| --- | --- |
| Dependency installation | Passed. npm reported zero known vulnerabilities for 718 audited packages. |
| `npm run ai:verify` | Passed final scaffolding checks, lint, type checking, 43 unit/component tests, 47 browser tests, and the production build. This command excludes live provider acceptance. |
| Invitation validation | Passed default validity, malformed, tampered, expired, wrong issuer/audience/algorithm, invalid room, and excessive lifetime cases. |
| Token endpoint | Passed origin rejection, disabled admission, strict input shape, oversized streamed input, invalid names, room/identity substitution, and unsupported methods. |
| Token permissions | Passed signed-token verification for server-generated identities, five-minute expiry, camera/microphone-only publication, and disabled data/admin grants. |
| Capacity configuration | Passed checks that every admission creates/checks a two-participant room and includes the same configuration in its token. Mocked tests alone do not prove provider enforcement. |
| Preview ownership | Passed explicit capture, track reuse on publish, failed connection/publish cleanup, late permission/switch cleanup, cancellation, duplicate-action rejection, and SDK mute delegation. |
| Local invitation command | Passed synthetic signing and validation without provider access. Invalid operator configuration outputs no credential. |
| Browser cleanup | Passed real browser capture cleanup with Chromium synthetic devices after failed admission, toggling off, and leaving setup. |
| Browser privacy | Passed fragment removal, reload behavior, and non-persistence of credentials. Only the SDK's exact `SILENT` log-level settings are allowed in local storage. |
| Browser layouts | Passed axe and overflow checks for private setup and invitation-required states at 320, 390, 768, and 1440 pixels in Chromium and WebKit. |

An initial browser run used an unsupported nested launch configuration; synthetic capture tests now have a separate test file.
The call alert now has an accessible name to distinguish it from Next.js route announcements.
A privacy assertion exposed SDK log-level persistence. The test now allows only those documented, non-sensitive settings.
A later review added fragment handling when another invitation opens on the same page. It also releases the previous session.

#### Playwright MCP visual review

Passed on the local production build with admission disabled.
Captured and viewed `phase2-setup-320.png`, `phase2-setup-390.png`, `phase2-setup-768.png`, and `phase2-setup-1440.png`.
Also viewed `phase2-invitation-required.png`, `phase2-landscape.png`, `phase2-text-200.png`, and `phase2-focus.png`.
Evidence stays in ignored `artifacts/playwright/`. The invitation input used for these screenshots was deliberately invalid.
The private setup reflows from two columns to one. Labels remain readable and keyboard focus remains visible.
At 200% root text size, controls remain reachable without horizontal page overflow.
The MCP session reported zero console errors or warnings. These screenshots do not prove live media transport.

#### Provider checks with synthetic browser media

The user confirmed LiveKit Cloud Build before these tests. Only temporary test rooms were used.
The local production process used an `ADMISSION_ENABLED=true` override. The ignored `.env.local` file remained unchanged.
This process was stopped after testing. No external admission or deployment was enabled.

| Check | Actual result |
| --- | --- |
| Bidirectional transport | Passed in isolated Chromium contexts. Remote video decoded in both directions; inbound audio RTP bytes increased in both directions. |
| SDK controls | Passed camera mute/unmute propagation to the remote interface and microphone state reflected by the local control. |
| Leave and rejoin | Passed capture cleanup, remote departure, and rejoin with an invitation held in memory. |
| Two-participant capacity | Failed repeatedly. The provider returned `maxParticipants: 2` and three connected standard participants. None had hidden or agent permissions. |
| Isolated capacity reproduction | Failed with one explicit room creation and standard participant tokens, independent of the application token endpoint. A third participant still connected. |
| Room recreation | Failed to verify. Rejoin after deletion connected, but listing the recreated room did not return the expected configuration within 15 seconds. |
| Optional live command | `npm run test:live` returned failure. It is excluded from `ai:verify`, uses real provider resources, and keeps credential-bearing errors out of output. |
| Cleanup | Test browser contexts closed. Temporary rooms were deleted or returned not found. A final provider query returned zero active rooms. `.env.local` still had admission disabled. |

The provider's documented capacity setting did not establish the required boundary in this project.
The cause remains unverified. The separate reproduction narrows the problem but does not establish a provider defect.
Do not substitute a browser counter or a server count check: neither protects simultaneous joins without authoritative allocation.
Keep external admission disabled until the capacity requirement has a verified solution.

Connected screenshots at 1440 and 390 pixels were captured by Playwright Test and viewed separately from the MCP setup screenshots.
They show synthetic media, not physical camera output. These checks do not prove audible quality or Mac/iPhone communication.
The free plan was confirmed by the user; metered usage and billing settings were not independently inspected.
The final default verification passed after the same-page invitation correction. `git diff --check` also passed.

#### Human review and remaining checks

Phase 2 remains incomplete because capacity acceptance failed. Human review is pending.
Mac Chrome/Safari with a physical iPhone, actual microphone/speaker quality, and physical camera cleanup remain Not run.
A trusted HTTPS address is required for iPhone capture. No deployment or certificate trust changes occurred.
Review the invitation workflow and perform the Mac/iPhone acceptance cases before treating Phase 2 as fully accepted.
Phases 3 and 4 remain unstarted. No commit, push, or deployment occurred.
Suggested commit message: `feat: add private LiveKit calls and protected admission`.

### Phase 2 capacity investigation follow-up: 2026-09-10

The user asked to continue. `ADMISSION_ENABLED=false` remains the correct local default.
No change to `.env.local` is needed for agent-run validation; controlled tests can use a process override.

Read the LiveKit Community discussion and current participant identity documentation through the LiveKit documentation MCP.
The discussion describes metadata propagation between regions. It does not establish a reliable minimum admission delay.
The architecture records a proposed separate-invitation workflow. Its acceptance and implementation remain pending.

A provider API probe created and deleted a temporary room, then immediately requested creation with the same name.
The second creation returned the original room identifier and limit of two.
Room listing returned no matching room at immediate, 1-second, 4-second, and 14-second observations.
The final deletion returned not found. No participant joined this probe.
This reproduces the recreation inconsistency without the application endpoint or browser SDK.
The cause remains unverified; this is not a passing recreation result.

A second probe waited three seconds after deletion and changed the requested empty-room timeout.
It returned the same inconsistent result. A final provider query returned zero active rooms.
Scaffolding and documentation link checks passed. `git diff --check` passed.
No application code, credentials, account settings, or deployment changed during this investigation.

### Phase 2 database-free revision: 2026-09-10

The user clarified that this is a demo without strict functional requirements and asked to avoid a database.
The revised acceptance target uses two participant-specific invitations and connection replacement.
This supersedes the earlier requirement to reject every additional device. Earlier failed results remain recorded above.
The server issues only two stable identities per room; it does not create a third identity for a reused invitation.

| Check | Actual result |
| --- | --- |
| `npm run ai:verify` | Passed scaffolding checks, lint, type checking, 50 unit/component tests, 47 browser tests, and the production build. |
| Invitation and identity checks | Passed separate signed places, missing/invalid places, place tampering, client-selected places, concurrent exchanges, and renewal after signing-key rotation. |
| Operator command | Passed two distinct invitations for the same room with places 1 and 2. Earlier shared invitations are rejected. |
| `npm run test:live` | Passed against the user-confirmed free project using synthetic media and isolated Chromium contexts. |
| Media transport | Remote video decoded in both directions and inbound audio RTP bytes arrived in both directions. |
| Media controls | Camera mute/unmute propagated remotely; the microphone control reflected SDK state. |
| Invitation replacement | Reusing the first invitation disconnected its original connection, displayed the replacement notice, and stopped its capture. The other participant remained connected. The provider listed two distinct identities. |
| Leave/rejoin | Leaving updated remote presence. The original participant rejoined with capture off using their invitation. |
| Active room deletion | Deleting the initial active room disconnected both participants and stopped capture. |
| Rejoin after deletion | Concurrent joins with the two invitations succeeded. The provider listed two distinct identities and each browser displayed one remote participant. |
| Replacement after recreation | Reusing an invitation again replaced its connection and left two listed participants. |
| Provider metadata limitation | Listing the recreated room still did not return its configuration. The revised identity rule does not depend on this listing. Administrative deletion of the recreated room while active remains unverified. |
| Cleanup | Closed all test contexts. A final provider query returned zero active rooms. The enabled local process was stopped. `.env.local` remained unchanged with admission disabled. |
| `git diff --check` | Passed. |

The first TypeScript check required an explicit return type for the validated participant place. The corrected final checks passed.
No database, paid service, or account change was added. The default suite makes no provider calls.

Playwright MCP captured and the agent viewed all eight `phase2-fixed-*.png` screenshots.
These cover invitation-required and setup states at 320, 390, 768, and 1440 pixels, landscape, 200% root text size, and focus.
The revised notice remained readable. The MCP session reported zero console errors or warnings.
The live command captured desktop and mobile-width media screenshots and the replacement notice; all three were viewed.
Raw evidence remains under ignored `artifacts/playwright/`.

These observations do not establish instantaneous cross-region replacement or physical-device media quality.
Mac Chrome/Safari and physical iPhone call acceptance remain Not run. A trusted HTTPS setup is still needed for iPhone capture.
Human review is pending for the revised invitation behavior and physical-device checks. Phases 3 and 4 remain unstarted.
Suggested commit message: `fix: use participant invitations for database-free calls`.
No commit, push, or deployment occurred.

### Phase 2 human review and Phase 3 authorization: 2026-09-10

The user committed the database-free revision and instructed the coding agent to continue.
This accepts the Phase 2 code increment and authorizes Phase 3. It does not supply physical-device results.

### Phase 3 resilience and privacy: 2026-09-10

Revision: uncommitted Phase 3 changes after the user's committed Phase 2 revision.
Environment: macOS arm64, Node.js 26.8.1, npm 11.19.0. No new package dependencies were added.

| Check | Actual result |
| --- | --- |
| `npm run ai:verify` | Passed scaffolding checks, lint, type checking, 51 unit/component tests, 63 browser tests, and production build. |
| Permission denial | Passed Chromium permission denial applied to its isolated browser context. The application checked the denied state before requesting capture. No fake permission grants were used in this case. |
| Error recovery | Passed injected denied, missing, busy, and unsupported-constraint cases in Chromium and WebKit. Fixed messages received focus and did not expose synthetic private error text. |
| Capture recovery | Passed a camera failure followed by successful synthetic capture and alert removal. |
| Cancelled setup | Passed cancellation of stalled admission and unanswered permission requests. Late camera results stopped; the new setup could enable audio while the old camera request remained unanswered. |
| Device state | Passed an ended input followed by SDK restart in a focused lifecycle test. Device refresh and a simulated device-change event requested no capture. |
| Privacy headers | Passed assertions for no-referrer, frame-ancestor restrictions, and same-origin capture permissions. |
| Browser accessibility | Passed existing layout/axe checks plus error-state scans. Error focus and enabled recovery controls were checked. |

Initial error injection was unstable in WebKit. The fixture now waits for setup and overrides the method on the instance and prototype.
The first Chromium denial command targeted the default context; it now targets the isolated context and verifies the denied state.
Without that correction, this environment's capture call returned NotSupportedError. Those earlier runs were not accepted as permission-denial evidence.

SDK source review showed that device enumeration can await a global pending-capture promise.
The application now uses the browser's permission-free enumeration API so a reset does not wait on a disposed controller.
A browser regression test covers audio capture while the earlier camera request is still unanswered.

#### Live recovery and visual inspection

`npm run test:live -- --recovery` passed against the user-confirmed free LiveKit project.
The command used isolated Chromium contexts and synthetic capture devices. It exercised actual provider transport.

| Check | Actual result |
| --- | --- |
| Audio-only participation | Both cameras turned off. Video elements were removed and inbound audio RTP bytes continued increasing in both directions. |
| SDK recovery | Browser network emulation and explicit signaling socket closure triggered the SDK reconnection state. Leave remained enabled. Media controls stayed disabled until reconnection completed. The restored session received further inbound audio. |
| Existing live behavior | Bidirectional video decoding, mute controls, invitation replacement, leave/rejoin, initial active-room deletion, and concurrent rejoin passed again. |
| Provider metadata | The recreated room's configuration remained absent from room listing. Identity admission does not depend on this listing. Administrative deletion of a recreated active room remains unverified. |
| Cleanup | The live command closed its contexts. A separate provider query returned zero active rooms. The enabled local process stopped. The review server restarted with admission disabled. `.env.local` remained unchanged. |

The first recovery run checked for zero video elements before turning off the second camera.
The assertion order was corrected. The final run passed with both cameras off before that check.
This simulated interruption proves SDK signaling recovery. It does not prove physical network handoff or every media transport failure.

Playwright MCP captured nine Phase 3 setup and recovery screenshots. The agent viewed all nine.
They cover widths of 320, 390, 768, and 1440 pixels, landscape, 200% root text size, permission failure, pending capture, and setup reset.
Messages remained readable and controls stayed within the page width. The MCP session reported zero console errors or warnings.
The agent also viewed the live reconnection and mobile audio-only screenshots.
Leave remained visible during reconnection. Mobile call controls wrapped within their panel and remained near the viewport bottom.
The first MCP inspection attempts used an unsupported tool name and an outdated click argument.
The final inspection used the installed server's tool schema and completed successfully.
Raw screenshots and synthetic result records remain under ignored `artifacts/`.

#### Human review and remaining checks

Review the permission recovery messages, setup cancellation, and call controls before accepting Phase 3.
Physical Mac Chrome/Safari and iPhone Safari checks remain Not run.
Actual speaker quality, physical device changes, Wi-Fi/cellular calls, and physical network interruption remain Not run.
A trusted HTTPS address is still required for iPhone capture. No deployment or certificate trust changes occurred.
Phase 3 implementation and automated validation are ready for review. Physical-device acceptance remains incomplete.
Phase 4 remains unstarted. No commit, push, or deployment occurred.
Suggested commit message: `feat: add call recovery and privacy controls`.

### Local network testing setup: 2026-09-10

The user requested local network access for phone invitations. This is a testing setup change, not Phase 4 deployment.
Added `lan:setup`, `dev:lan`, and `invite:lan`. The development server binds to all IPv4 interfaces with HTTPS.
The two LAN commands load the same ignored origin configuration. `.env.local` and existing certificate trust settings remain unchanged.

| Check | Actual result |
| --- | --- |
| Certificate setup | Passed using the installed mkcert and its existing CA. The leaf certificate covers the selected local IPv4 address. Only the public CA certificate was copied for phone installation. |
| Setup input | A loopback address was rejected. Setup accepts an address assigned to a non-loopback IPv4 interface. |
| HTTPS response | The LAN address returned HTTP 200 with CA validation enabled. |
| Browser access | Isolated Chromium loaded and hydrated the private call entry page without certificate bypass. It reported a secure context and an available capture API, with zero page errors. No device capture was requested. |
| Invitations | Synthetic-secret command validation produced two distinct invitations with the configured LAN HTTPS origin. Credentials were not printed in the result record. |
| Admission origin | The LAN origin reached invitation validation and rejected a synthetic invalid invitation with 401. A localhost origin received 403. The response used no-store. No provider call occurred. |
| Repository checks | Script syntax, lint, type checking, scaffolding checks, and documentation links passed. Certificates and LAN configuration are ignored by Git. |

The first launcher passed Node env-file flags directly to Next.js. Its development worker rejected those flags in NODE_OPTIONS.
The launcher now loads the files and starts a child process with the resulting environment.
A restricted development process reported filesystem watcher errors. It was stopped; the approved local process started without those errors.
The first browser probe used the system cache path. The final probe used the repository's installed browser and passed.
An initial HTTP probe targeted a nonexistent route; the corrected `/api/token` checks passed as recorded above.

The HTTPS development server remains running with admission enabled for the user's requested local testing.
Physical iPhone certificate installation and trust remain pending. Phone connectivity and physical media tests remain Not run.
The full application suite was not repeated for this local tooling change. Earlier Phase 3 results remain recorded above.
No commit, push, public tunnel, or deployment occurred.


### User-reported physical streaming: 2026-09-10

After the local HTTPS setup, the user reported that the desktop and iPhone both streamed with no issues.
Result: Passed for this initial physical-device streaming check, based on the user's report.
The agent did not observe the physical devices. Device models, OS versions, and browser names and versions were not supplied.
Separate audio quality results and the required Chrome/Safari browser combinations were not reported.
The remaining physical-device cases in the matrix stay Not run. This result does not establish failure recovery or cellular coverage.
Earlier Not run entries describe the state before this user report and remain as historical records.
