# Operations

Use these procedures only for the operator's selected LiveKit project and Vercel deployment.
All API credentials stay in ignored local configuration or server environment variables.
See [Deployment](deployment.md) for hosting setup and [Privacy and cost](../planning-docs/privacy-and-cost.md) for limits.

## Local room commands

The repository uses the installed official LiveKit server SDK. No separate LiveKit CLI installation is required.
Commands read `.env` and `.env.local`, with local values taking precedence. Exported process variables take precedence over both files.
Use `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `CALL_ROOM_NAME` for the intended project.
Verify those values locally before a destructive command. Do not copy them into chat or logs.

```sh
npm run room -- status
npm run room -- close --confirm
```

`status` reads the configured room's participants and prints only the count and state.
`close --confirm` deletes that room and reads its participants again. It does not close all rooms in the project.
The confirmation flag is required. No provider request occurs when it is missing.

For an optional signed-invitation room, specify its non-secret room name:

```sh
npm run room -- status --room lsl-12345678-1234-4234-8234-123456789abc
npm run room -- close --room lsl-12345678-1234-4234-8234-123456789abc --confirm
```

Replace the example with the actual room. Find signed-invitation rooms in the LiveKit dashboard without publishing participant details.

| Result                       | Meaning                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `active`                     | Participants are currently reported.                                                                          |
| `empty`                      | No participants are reported. This does not establish that the room is absent.                                |
| `absent`                     | The provider returned `not_found`.                                                                            |
| `participants_still_present` | The close check found participants. The command exits unsuccessfully.                                         |
| `room_operation_failed`      | Configuration or provider access failed. Inspect configuration privately; raw provider errors are suppressed. |

A zero exit code is a point-in-time result. It does not block future joins or prove token revocation.
A provider timeout after deletion is an unknown result. Run `status` again; do not assume the call is still active or closed.
Room deletion disconnects participants. The commands use the documented room and participant APIs.
[LiveKit room management](https://docs.livekit.io/intro/basics/rooms-participants-tracks/rooms/),
[Participant management](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/).

## Stop admission and end calls

1. Set production `ADMISSION_ENABLED=false` in Vercel and redeploy the reviewed code with current environment values.
2. Run the synthetic admission check from the canonical page. Require 503 `admission_disabled` and a no-store response.
3. Stop any local admission-enabled processes connected to the same LiveKit project.
4. Close the configured room with `npm run room -- close --confirm`. Close any separately issued invitation rooms explicitly.
5. Confirm the physical clients disconnect and release their capture devices. Run `status` to check participant counts.
6. Recheck after at least five minutes from the last possible successful token issuance. Investigate any continuing or recreated call.

Disabling admission does not terminate active calls. Existing participant tokens have a five-minute initial lifetime.
Connected clients can receive SDK refresh tokens. Do not treat a five-minute wait alone as a shutdown guarantee.
Keep admission disabled throughout room termination and verification. If status or client results are uncertain, shutdown is unverified.

Environment changes do not update older Vercel deployments. A request to an older deployment can use its stored configuration.
Origin checking is not a substitute for removing access to that server endpoint.
Protect or delete older admission-enabled deployments, including branches or other projects using the same LiveKit key.
[Vercel secret rotation](https://vercel.com/docs/environment-variables/rotating-secrets).

For an emergency, revoke the dedicated LiveKit API key used by the app to stop those deployments issuing new tokens.
Retain a separate authorized operator key for room administration. Do not revoke a shared key without assessing its other users.
Key revocation does not replace explicit room termination or verification of existing connections.

## Rotate access

Change the host or guest code in the production environment, then redeploy.
Keep `CALL_ROOM_NAME` unchanged to preserve participant places. Update local operator configuration privately when appropriate.
Old codes no longer exchange at the updated endpoint. Existing calls and issued tokens are separate lifecycles.
Protect or delete deployments retaining old values, then share the new code only with its intended participant.

For signed invitations, rotate `INVITATION_SIGNING_SECRET` and redeploy to reject all invitations signed with the previous secret.
There is no individual invitation revocation list. Changing that secret does not end active calls.

## Usage and service failure

Check LiveKit and Vercel usage before sharing access. Verify the actual free plans and disabled paid add-ons.
When allowances run out, leave the demo unavailable. Do not upgrade automatically or attach a paid fallback.
Use provider dashboards for aggregate usage. Do not add application analytics or persist participant information.

| Symptom                         | Operator check                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `admission_disabled`            | Confirm whether admission should be enabled on this deployment.                                      |
| `origin_rejected`               | Match `APP_ORIGIN` to the exact canonical HTTPS origin and redeploy.                                 |
| `invalid_code`                  | Check the exact code and which deployment is serving the request.                                    |
| `service_unavailable`           | Check code format, room format, API credentials, provider availability, and free allowances locally. |
| Another connection is displaced | Each host or guest code holds one place. Give the other participant the other code.                  |
| iPhone cannot capture           | Check HTTPS trust and browser camera/microphone permission.                                          |

## Rollback and removal

A rollback can restore admission-enabled configuration or old credentials. First disable admission and review the target deployment's values.
Prefer redeploying reviewed code with current disabled configuration instead of promoting an unchecked previous deployment.
Verify the disabled endpoint again before reopening access.

To retire the demo, stop admission, terminate its rooms, and verify the clients disconnected.
In Vercel, open the selected project's Settings > General > Delete Project after explicit removal authorization.
[Vercel project management](https://vercel.com/docs/projects/managing-projects).
Confirm its production and deployment URLs no longer serve the application. Remove any associated Git deployment integration if it remains.
In LiveKit, revoke dedicated demo keys and remove only the dedicated demo project when authorized.
Do not delete a shared LiveKit project. Remove local test certificate profiles from phones and stop local LAN servers.
Resource removal is a separate destructive action; these instructions do not execute it.
