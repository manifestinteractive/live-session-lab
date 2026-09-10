# Privacy and cost

Status: requirements for the planned application. Account plans and deployed controls have not been verified.

## Data handling

This prototype supports test conversations with temporary display names. Exclude sensitive real-world use.
The application will not record or transcribe calls. Add no analytics, database, user accounts, or stored call history.

| Data                                 | Planned handling                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Camera/microphone preview            | Remains local before joining. Capture starts only after an explicit participant action.                             |
| Published audio/video                | Travels through LiveKit to the other participant after joining. The application stores no call content.             |
| Temporary display name               | Sent to the token endpoint and LiveKit for participant display. Never include it in application logs.               |
| Participant and room identifiers     | Use generated, non-sensitive identifiers. LiveKit and participants process identifiers needed for the room.         |
| Invitation and participant tokens    | Bearer credentials held in browser memory; never persist them in browser storage or diagnostic output.              |
| Signing and API secrets              | Local operator environment and server environment only. Never include them in browser bundles or public files.      |
| IP addresses and connection metadata | Hosting and media providers process connection information. Do not claim that providers retain no logs or metadata. |

Use HTTPS and standard encrypted WebRTC transport. Do not claim end-to-end encryption or regulatory compliance.
LiveKit documents end-to-end encryption as an additional feature that requires application key distribution.
It is outside this release. [LiveKit encryption](https://docs.livekit.io/transport/encryption/)

Remove invitation fragments immediately after reading them. Use same-origin POST and non-cacheable token responses.
Do not add third-party scripts that can read credentials. Do not log request bodies, tokens, invitation URLs, or display names.
Keep diagnostics restricted to supported SDK status. Treat invitation sharing as granting bearer access until expiry.
Another participant can capture a call outside this application; no application claim should imply otherwise.

Use synthetic data in automated tests. Keep raw browser evidence under ignored `artifacts/`.
Avoid traces or screenshots containing credentials or real participant information.
Store only sanitized test outcomes in public documentation. Do not put real conversations into AI development tools.

## Zero-cost operation

Pricing facts checked on 2026-09-10. Verify them again before deployment or a plan change.

| Service       | Selected plan | Limit behavior                                                                                                  |
| ------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| LiveKit Cloud | Build, free   | Includes 5,000 WebRTC participant-minutes and 50 GB downstream transfer monthly. Free allowances are hard caps. |
| Vercel        | Hobby, free   | Personal, non-commercial use with resource limits. Features can pause when usage exceeds allowances.            |

LiveKit rejects new requests at exhausted free allowances instead of billing overages.
Free allowances are shared across a user's free projects and reset monthly.
[LiveKit quotas and limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/)

Two people connected for ten minutes use twenty participant-minutes. Bandwidth is a separate allowance and depends on actual media traffic.
Do not promise a fixed number of free calls or uninterrupted availability.

Vercel Hobby is restricted to personal, non-commercial use. Many exceeded limits require waiting before the feature becomes available again.
[Vercel Hobby](https://vercel.com/docs/plans/hobby)

Use the included hosting address. Do not buy a domain or enable paid add-ons for this prototype.
Do not use a paid plan's included allowance as a substitute for a free plan with hard limits.
The zero-cost target covers these hosted services. Existing internet access and development tools remain outside that target.
If provider terms change, disable the demo and review the plan before accepting charges.

## Operator controls

Before deployment, confirm LiveKit Build and Vercel Hobby in the actual account dashboards.
Check any shared allowance already used by other projects. Record the date and confirmed plan names without account identifiers.

Issue two participant-specific invitations per room. Reuse replaces that participant's connection. Do not publish a reusable invitation in the repository or landing page.
Use provider request protections available on the free plans. Do not claim an in-memory limiter protects all serverless instances.
Inspect provider usage before an external test session. Treat provider-enforced free limits as the cost boundary.

Handle quota and provider failures with a useful unavailable state. Do not retry indefinitely or automatically upgrade services.
A quota failure does not prove that an existing call ended.

To stop admission, disable the token endpoint through the documented server setting and apply the hosting configuration change.
Previously issued tokens may still permit admission until expiry. Disabling new tokens does not disconnect active participants.
Use authorized LiveKit room administration to terminate active rooms, and verify that they are closed.
Account for the remaining lifetime of issued tokens when verifying that new sessions can no longer start.

Without a database, the application has no individual invitation revocation list.
Rotating the invitation signing secret invalidates invitations signed with the old secret for future exchanges.
It does not revoke issued participant tokens or end existing calls. Keep admission disabled while completing shutdown.

The Phase 4 guide must supply exact, verified operator commands and hosting steps for shutdown and resource removal.
Document separate removal of the Vercel deployment and LiveKit resources when testing ends.

## Phase 1 data handling (historical)

The disconnected interface does not request capture permissions, enumerate devices, or connect to LiveKit.
The temporary display-name field is not submitted. The application does not copy it to browser storage or cookies.
Reloading or leaving the setup clears the field in the tested browsers. Browser extensions and browser-managed state remain outside application control.
The interface loads no external fonts, analytics, or provider resources.
Local Next.js development tooling processes page requests. A future deployment can also generate provider request logs.
The application needs no credentials to run Phase 1. `.env.example` contains placeholders for later integration.
`ADMISSION_ENABLED=false` records the future default; no admission endpoint exists to enable in Phase 1.

## Phase 2 data handling

The private call route reads the invitation fragment after hydration and removes it before setup interaction.
No third-party scripts load in the application. Invitations and issued participant tokens stay in memory.
A participant must click to start camera or microphone preview. Preview stays local until Join publishes its tracks.
Join sends the invitation and temporary name to the application server. LiveKit receives the name and media after connection.
The server checks the room configuration through LiveKit before issuing a participant token.
Provider logs and browser network inspection can contain connection metadata. Application storage and logs do not retain call content or credentials.
The client disables SDK diagnostic logging. The SDK persists non-sensitive `SILENT` log-level settings in local storage.
No invitation, token, display name, device choice, or call content enters that storage. Tests check the exact allowed settings.
Browser-level diagnostics remain outside application control.

Disabling admission blocks future token requests. Previously issued five-minute tokens can still be used until expiry.
Existing connections and SDK reconnect tokens have their own lifecycle. Invitation expiry does not terminate them.
An operator must end active rooms separately. Short room departure timeouts remove empty rooms, not active calls.
Individual invitation revocation remains unavailable without rotating the shared signing secret, which invalidates all unexpired invitations.
Rotating that secret does not revoke already issued LiveKit tokens.

Automated checks use synthetic secrets and mocked provider administration. Invitation-bearing browser tests do not retain traces or videos.
The default suite uses no real credentials or provider resources. The separate opt-in live command uses a confirmed free project.
Physical-device validation remains separate.

## Phase 2 capacity limitation

The live check on 2026-09-10 admitted three ordinary participants while LiveKit reported `maxParticipants: 2`.
A separate test with one room creation and standard tokens reproduced the failure.
The room setting alone did not establish capacity. The revised demo issues only two stable identities instead.
Invitation reuse replaces its existing connection. Anyone with the invitation can use that place until expiry.
This avoids a database, but does not provide strict device reservations or participant identity verification.
The optional `npm run test:live` command consumes provider allowance and must run only on a confirmed free project.
The default `npm run ai:verify` command keeps admission disabled and makes no provider calls.
See [Validation](validation.md) for observations and unperformed physical-device checks.
