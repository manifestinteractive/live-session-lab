# Privacy and cost

Status: requirements for the planned application. Account plans and deployed controls have not been verified.

## Data handling

This prototype supports test conversations with temporary display names. Exclude sensitive real-world use.
The application will not record or transcribe calls. Add no analytics, database, user accounts, or stored call history.

| Data | Planned handling |
| --- | --- |
| Camera/microphone preview | Remains local before joining. Capture starts only after an explicit participant action. |
| Published audio/video | Travels through LiveKit to the other participant after joining. The application stores no call content. |
| Temporary display name | Sent to the token endpoint and LiveKit for participant display. Never include it in application logs. |
| Participant and room identifiers | Use generated, non-sensitive identifiers. LiveKit and participants process identifiers needed for the room. |
| Invitation and participant tokens | Bearer credentials held in browser memory; never persist them in browser storage or diagnostic output. |
| Signing and API secrets | Local operator environment and server environment only. Never include them in browser bundles or public files. |
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

| Service | Selected plan | Limit behavior |
| --- | --- | --- |
| LiveKit Cloud | Build, free | Includes 5,000 WebRTC participant-minutes and 50 GB downstream transfer monthly. Free allowances are hard caps. |
| Vercel | Hobby, free | Personal, non-commercial use with resource limits. Features can pause when usage exceeds allowances. |

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

Use private invitations and enforce two participants per room. Do not publish a reusable invitation in the repository or landing page.
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
