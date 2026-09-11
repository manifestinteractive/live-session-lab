---
name: livekit-admission
description: Implement or review Live Session Lab invitation exchange, token issuance, and LiveKit media ownership.
---

# LiveKit admission and media ownership

Read `planning-docs/architecture.md` for admission and `planning-docs/privacy-and-cost.md` for data handling.
Reusable host and guest codes select two fixed places. Signed invitations default to one hour of validity.
Use five-minute participant tokens and two stable identities per room, including after room recreation.
Keep the provider participant limit as a secondary setting. Credential reuse replaces its existing connection.
Use `livekit_docs` MCP to verify current WebRTC transport, React component, and server SDK APIs before editing integrations.
Fetch relevant pages after searching. Check compatible package versions. Do not scaffold LiveKit AI Agents.
If MCP is unavailable, use official pages at https://docs.livekit.io/.

Keep invitation signing and token issuance on the server. Use an established signing library.
Validate reusable codes against server configuration, or verify signed invitation signature and expiry.
Only the validated credential determines the room and participant place.
Reject room substitution. Generate participant identities on the server.
Test valid exchange, expired/tampered/missing credentials, disallowed origin, invalid input, and room substitution.
Assert short token expiry, ordinary participant grants, server-generated identity, and non-cacheable responses.
Use synthetic test secrets. Do not call LiveKit Cloud for unit tests or log issued tokens.

Read the invitation from the URL fragment, remove it from the URL, and exchange through same-origin POST.
Keep credentials out of persistent browser storage and diagnostic output.
Explain that admission expiry does not terminate an active connection.

Use official LiveKit media components and SDK state. Avoid a second reconnect loop or optimistic mute indicators.
Define which component owns each local track during preview, join, failure, unmount, and leave.
Release tracks that the application owns when preview is abandoned or the participant leaves.
Test failed joins and preview-to-room transitions for duplicate capture or leaks.
When credentials are unavailable, finish testable integration code and record real-media checks as blocked.
