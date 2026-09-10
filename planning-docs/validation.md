# Validation

Status: planning and AI scaffolding only. Application Phases 1 through 4 are unstarted.
Planned cases below are not test results.

## Automated checks

| Layer | Required cases |
| --- | --- |
| Planning and scaffolding | Local documentation links, agent references, configuration and skill metadata, script syntax, and session-start context. |
| Phase 1 shell | Introduction and invitation requirement, disconnected labels, accessible controls, and responsive layout. |
| Admission | Valid, missing, malformed, expired, and tampered invitations; disallowed origin; invalid display input; room substitution; disabled admission. |
| Token permissions | Server-generated identity, validated room binding, five-minute expiry, ordinary participant grants, and non-cacheable responses. |
| Capacity | Reject a third participant and enforce the limit after room recreation; test concurrent joins with configured LiveKit. |
| Media lifecycle | Preview cancellation, failed join, component unmount, duplicate capture prevention, mute state, leave, and rejoin. |
| Recovery and privacy | Permission errors, unavailable inputs, provider/quota errors, no persistent credentials, and sanitized application diagnostics. |

Use Vitest for focused unit/component checks and Playwright for repeatable browser behavior.
Use synthetic signing secrets. Unit tests must not consume LiveKit Cloud resources.
Mocks can validate application behavior but cannot establish provider enforcement or real media transport.

Once the application exists, run `npm run ai:verify` for lint, type checks, tests, browser tests, and production build.
The existing command fails while application scripts are missing. This is expected before Phase 1.
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

| Scenario | Required coverage | Status |
| --- | --- | --- |
| Two-way audio/video | Mac Chrome + iPhone Safari; Mac Safari + iPhone Safari. | Not run |
| Different networks | Mac on Wi-Fi and iPhone on cellular, when available. | Not run |
| Pre-join and cleanup | Preview, cancel, join, leave, and verify capture indicators stop. | Not run |
| Permissions | Deny or dismiss access, then recover on each target browser. | Not run |
| Audio-only | Join without video and confirm mutual audio. | Not run |
| Device changes | Change inputs on the Mac; test iPhone input controls only where supported. | Not run |
| Network interruption | Interrupt a connection and verify SDK recovery or a useful recovery action. | Not run |
| Participant lifecycle | Remote departure and leave/rejoin while admission remains valid. | Not run |
| Playback and mobile state | Audio activation, phone rotation, background/foreground, and recovery after screen lock. | Not run |
| Accessibility | Mac keyboard operation and VoiceOver checks; iPhone touch and VoiceOver checks. | Not run |
| Deployment | HTTPS, private admission, cross-device call, unavailable state, and operator shutdown. | Not run |

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

| Check | Actual result |
| --- | --- |
| `npm run ai:check` | Passed after adding planning links, agent references, and startup context checks. |
| Skill-creator validation | Passed for phase-delivery, livekit-admission, and browser-validation. |
| Isolated public copy | Passed with public documentation and scaffolding copied into a temporary directory. Installed dependencies were shared for the check. |
| Missing-document check | Removing the architecture document from the temporary copy caused validation to fail, as expected. |
| Session-start context | The configured command returned the new planning index when run from the repository's docs directory. |
| Public reference review | Agent instructions and documentation use the new planning index. The replaced project brief has no remaining references. |
| `git diff --check` | Passed. |

These checks validate planning and scaffolding changes only. Browser tooling and package dependencies did not change in this update.
The earlier MCP and screenshot results remain in the initial scaffolding record; they were not rerun for documentation changes.
The session-start script ran directly for validation. Native hook activation and optional agent spawning were not exercised.

### shadcn scaffolding: 2026-09-10

| Check | Actual result |
| --- | --- |
| Pinned CLI | Installed `shadcn` 4.21.0; the CLI version command returned 4.21.0. npm reported zero known vulnerabilities for 320 audited packages. |
| Official skill source | All 15 files match upstream commit `3ba91b1cc83e1bbe4ab35a422ff2a694849c5048`; skill metadata parses. The upstream license is retained. |
| Codex MCP configuration | `codex mcp get shadcn --json` reported the local command with `enabled: true`. |
| `npm run ai:shadcn:smoke` | Passed connection, discovery of seven tools, and a search returning the official button component. |
| `npm run ai:check` | Passed, including the new MCP configuration, skill presence, and supporting document links. |
| `git diff --check` | Passed. |

The upstream MCP search response has a defect in generated add-command fields.
The [setup documentation](../docs/ai-development.md#shadcnui-setup) describes the pinned CLI workflow used for component changes.
The check did not initialize `components.json` or install application components. Component installation remains untested until Phase 1.
MCP access was verified through a client script. A new Codex session must load the updated MCP configuration.

### Application phases

No application checks or physical-device checks have run. No deployment exists.
