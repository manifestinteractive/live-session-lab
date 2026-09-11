# Privacy and cost

## Data handling

Use temporary names and test conversations. This demo is not intended for sensitive real-world use.
The application adds no recording, transcription, analytics, database, or stored call history.

| Data                                 | Handling                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Camera/microphone preview            | Stays on the participant's device until joining. Starts after an explicit media action.                            |
| Input discovery                      | A menu action can request temporary capture permission to reveal devices. Temporary tracks stop after enumeration. |
| Published audio/video                | Travels through LiveKit to the other participant. The application stores no call content.                          |
| Temporary name                       | Sent to the token endpoint and LiveKit for display during the call. Excluded from application logs.                |
| Room and participant identifiers     | Generated identifiers used by the application, LiveKit, and participants.                                          |
| Codes, invitations, and tokens       | Bearer credentials kept in browser memory during use. Never persist them in browser storage or logs.               |
| API and signing secrets              | Operator and server environments only. Excluded from browser bundles and public files.                             |
| Device labels and choices            | Kept in memory for input selection. Not stored by the application.                                                 |
| IP addresses and connection metadata | Processed by hosting and media providers. Provider processing and logs are outside application storage.            |

Use HTTPS and standard encrypted WebRTC transport. This release does not implement end-to-end encryption or make compliance claims.
LiveKit's additional encryption feature requires application key distribution. [LiveKit encryption](https://docs.livekit.io/transport/encryption/)
Another participant can capture a call outside this application.

## Trust boundaries

The browser removes invitation fragments after reading them. Admission credentials travel through a same-origin POST with non-cacheable responses.
Anyone with a code or invitation can use that participant place. Reuse replaces its connection; host does not grant administration.
No database provides individual invitation revocation or strict device reservations.

The application loads no third-party scripts, external fonts, or remote placeholder images.
Response headers prevent framing, suppress referrers, and restrict camera and microphone permissions to the same origin.
Screen capture and geolocation are disabled. These headers do not replace credential validation.

The SDK uses non-sensitive `SILENT` log-level settings in local storage. Credentials, names, device choices, and call content remain excluded.
Browser permission decisions, browser diagnostics, and provider logs have separate lifecycles.
Connection details shows SDK state and quality. Fixed error messages exclude raw provider errors and identifiers.

Input discovery requests only the selected input type. It does not publish, display, or record temporary capture.
Cancellation stops late capture results when they resolve. The app cannot close a browser permission prompt itself.
Mobile backgrounding or browser termination can interrupt calls; recovery is not guaranteed.

Use synthetic data for automated tests. Keep raw evidence in ignored `artifacts/` and omit credentials from screenshots and traces.
Do not put real conversations or credentials into AI development tools.

## Free operation

Public provider documentation was checked on 2026-09-11. Verify account plans and current limits again before deployment.

| Service       | Selected plan | Limit behavior                                                                                   |
| ------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| LiveKit Cloud | Build, free   | Includes 5,000 WebRTC participant-minutes and 50 GB downstream transfer monthly, with hard caps. |
| Vercel        | Hobby, free   | Personal, non-commercial use. Resource limits can pause affected features.                       |

LiveKit rejects new requests when free allowances are exhausted. Free projects share a user's allowances, which reset monthly.
Two participants connected for ten minutes use twenty participant-minutes. Bandwidth is a separate allowance.
Do not promise a fixed number of calls or continuous availability. [LiveKit quotas and limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/)

Vercel Hobby restricts use to personal, non-commercial projects. Exceeded limits can require waiting before features become available again.
[Vercel Hobby](https://vercel.com/docs/plans/hobby)

Use the included hosting address. Do not enable paid plans or add-ons to keep the demo running.
If provider terms change, disable admission and review the plan before accepting charges.
The zero-cost target covers hosting and media services. Existing internet access and development tools are outside that target.
Account confirmations and outstanding checks are in [Validation](validation.md).

## Operator controls

Verify LiveKit Build and Vercel Hobby in the actual dashboards before deployment. Check allowance shared with other projects.
Review usage before external sessions. The app has no distributed request limiter; provider free limits form the cost boundary.
Do not describe an in-memory limit as protection across serverless instances.

| Action                                                  | Effect and limit                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Set `ADMISSION_ENABLED=false`, then restart or redeploy | Stops new token issuance. Existing calls and already issued tokens remain valid.            |
| Rotate a host or guest code, then restart or redeploy   | Blocks future exchanges using that code. Keep the room name to preserve participant places. |
| Rotate the invitation signing secret                    | Invalidates signed invitations for future exchanges. Does not revoke participant tokens.    |
| Terminate active rooms through LiveKit administration   | Disconnects current participants. Issued tokens can still be usable until expiry.           |

Keep admission disabled during shutdown. Account for the five-minute lifetime of issued participant tokens and SDK reconnect behavior.
Invitation expiry and room empty timeouts do not terminate active calls.
Verify that rooms are closed. Phase 4 must verify exact operator commands and resource-removal procedures for the selected deployment.
See the [developer guide](../docs/developers.md#operating-limits) for local controls.

## Local phone testing

The optional LAN server binds to `0.0.0.0:3000` on a trusted local network. It is not a public deployment.
The setup script creates ignored certificates and LAN configuration using an existing mkcert certificate authority.
It does not install trust or change `.env.local`. Both devices must trust the selected HTTPS address.

Copy only the public root certificate to the phone. Never share private keys.
Installing it trusts certificates issued by that local authority. Remove the test certificate profile when testing ends.
A local IP address does not support cellular-only calls. Stop the LAN server after testing.
Follow the [phone testing instructions](../docs/developers.md#test-from-a-phone-on-the-local-network).
