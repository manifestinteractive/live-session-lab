# Deployment guide

Deploy Live Session Lab as a personal, non-commercial demo on Vercel Hobby with LiveKit Cloud Build.
This guide prepares a deployment. Creating or publishing it requires the operator's explicit instruction.
Use [Operations](operations.md) for admission changes, room shutdown, and resource removal.

## Release requirements

Run `npm run ai:verify` from a clean working tree with the development server stopped.
Review [Validation](../planning-docs/validation.md) for actual results and outstanding physical-device checks.
Commit and push only when instructed. Record the reviewed commit for the release.

Confirm the actual Vercel Hobby and LiveKit Cloud Build plans in their dashboards.
Check current usage, shared LiveKit allowances, and any enabled paid add-ons. Do not proceed on a paid trial.
LiveKit Build includes 5,000 participant-minutes and 50 GB downstream transfer monthly, with hard limits.
Vercel Hobby supports personal, non-commercial projects with usage limits.
Use the included `vercel.app` address. Service loss at free limits is acceptable.
[LiveKit limits](https://docs.livekit.io/deploy/admin/quotas-and-limits/), [Vercel Hobby](https://vercel.com/docs/plans/hobby).

## Hosting configuration

The root [vercel.json](../vercel.json) sets the Next.js framework, install command, and build command.
These values override the corresponding dashboard settings. Keep secrets in Vercel environment variables.
The root directory, Node.js version, production branch, and deployment protection remain dashboard settings.
[Vercel configuration reference](https://vercel.com/docs/project-configuration/vercel-json).

Use the Vercel dashboard to import the authorized repository into the confirmed Hobby account.
Importing and selecting Deploy publishes a deployment. Do this only after deployment authorization.

| Setting           | Value                                     |
| ----------------- | ----------------------------------------- |
| Framework preset  | Next.js                                   |
| Root directory    | Repository root                           |
| Install command   | `npm ci`                                  |
| Build command     | `npm run build`                           |
| Output directory  | Next.js default; do not use static export |
| Node.js version   | 24.x, matching the GitHub Actions job     |
| Production branch | `main`                                    |

The current package engine range permits Vercel's Node.js 24 runtime. Confirm the actual version in the build log.
The token endpoint needs server execution. WebRTC media travels through LiveKit, not through a Vercel function.
No database, extra WebSocket service, or custom server is required.
[Vercel Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Vercel's Git integration can deploy every branch push and automatically promote production-branch changes.
Connecting the repository enables that workflow; GitHub Actions alone does not deploy this app.
Use this Git connection for deployment and the existing [GitHub workflow](../.github/workflows/ci.yml) for validation.
No additional deployment workflow or Vercel token in GitHub is required for this arrangement.
Require the `Validate` check before merging to `main`, and treat future production pushes as deployment actions.
Do not assume Vercel waits for GitHub Actions before building or publishing.
Hobby also has repository ownership and commit-author restrictions. Check them before importing; do not upgrade to bypass them.
[Vercel Git deployments](https://vercel.com/docs/git).

## Environment variables

Use project-level variables. Enter secrets directly in the dashboard. Never paste them into source, issues, screenshots, or agent chat.
No application variable should use a `NEXT_PUBLIC_` prefix.
Do not upload `.env.local`, LAN configuration, certificates, or local browser evidence.

Set `ADMISSION_ENABLED=true` in Production so invited participants can join calls.
Use `false` for Preview deployments or when you intentionally want to stop new joins.

| Variable                                   | Production                                                          | Preview                     |
| ------------------------------------------ | ------------------------------------------------------------------- | --------------------------- |
| `LIVEKIT_URL`                              | LiveKit project's `wss://` origin                                   | Omit                        |
| `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` | Project API credentials                                             | Omit                        |
| `HOST_INVITE_CODE` and `GUEST_INVITE_CODE` | Distinct random codes, 20-128 allowed characters                    | Omit                        |
| `CALL_ROOM_NAME`                           | Fixed `lsl-UUID` room from the chosen project configuration         | Omit                        |
| `INVITATION_SIGNING_SECRET`                | Optional, random secret of at least 32 bytes for signed invitations | Omit                        |
| `APP_ORIGIN`                               | Exact canonical HTTPS origin, without a trailing slash              | Omit; calls remain disabled |
| `ADMISSION_ENABLED`                        | `true` to allow invited participants to join                        | `false`                     |

Use the [developer guide](developers.md#configure-private-calls) for exact code and room formats.
Keep the fixed room name stable when rotating host or guest codes. Host does not grant administration permissions.
Configure local operator credentials for the same LiveKit project before using room commands.

If the production address is not known during import, use `ADMISSION_ENABLED=false` temporarily and leave `APP_ORIGIN` unset.
After Vercel assigns the address, set `APP_ORIGIN` to that origin and `ADMISSION_ENABLED=true`, then redeploy.
This temporary disabled deployment cannot accept calls. If the address is already known, use the production settings above directly.
Do not derive the accepted origin from an incoming request or a preview URL.

Environment changes apply only to new deployments. Saving a variable does not change an existing deployment.
Do not promote a build with preview settings and assume production admission is configured correctly.
[Vercel environment variables](https://vercel.com/docs/environment-variables).

## Deployment access

Keep preview and deployment-specific URLs protected with Vercel Authentication where available on the free plan.
The canonical production domain must be accessible without a Vercel account so invited participants can open the form.
Verify the effective protection scope in a signed-out browser; do not turn all protection off to troubleshoot a preview.
Application codes protect calls, not access to the public introduction page.
[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

## Validate production admission

After the authorized deployment, open its canonical URL in a signed-out browser.
Confirm HTTPS without certificate warnings, the introduction and join form, and no automatic capture permission prompt.

Run these checks from the browser console on that page. They use a synthetic invalid code and never request a token successfully:

```js
const response = await fetch("/api/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: "synthetic-release-check", displayName: "Test visitor" }),
});
console.log(response.status, response.headers.get("cache-control"), await response.json());
```

Expected: status 401, `no-store, private`, and `{error: "invalid_code"}` because the test code is invalid.
A 503 `admission_disabled` means new joins are disabled. Set Production `ADMISSION_ENABLED=true` and redeploy to accept calls.
A 403 `origin_rejected` means the browser origin and `APP_ORIGIN` differ. Fix the configuration and redeploy.
A login page or redirect means deployment protection intercepted the request. Use the canonical production address.
Do not use real credentials in console commands or network dumps.

For an intentional shutdown check, set `ADMISSION_ENABLED=false` and redeploy, then repeat the synthetic check.
Expect 503 `admission_disabled` with the same no-store header. Restore `true` and redeploy when calls should resume.

## Test calls

Share the canonical URL privately with separate host and guest codes. Optional `#invite=<code>` links use the exact configured code.
Participants need no Vercel account at this address. Share links directly, not through public repository documentation.

Complete the physical matrix in [Validation](../planning-docs/validation.md): Mac Chrome/Safari and iPhone Safari,
Wi-Fi and cellular, permission recovery, audio-only calls, interruption, leave/rejoin, and orientation.
iPhone Safari can retain its address bar in the expanded viewport fallback. This is a documented limitation, not a release blocker.

Verify [shutdown](operations.md#stop-admission-and-end-calls) using a controlled test call before broader sharing.
Record actual results, versions, network conditions, and any limitations. Do not substitute WebKit emulation for an iPhone test.

Install from the canonical HTTPS address using [the browser's installation controls](../README.md#install-the-app).
Check the app icon, standalone launch to the blank join page, rotation, device permissions, and leave/rejoin.
Record installed iPhone and desktop results separately from normal browser results.

## Release record

Record these fields in the validation document after actual deployment:

- Reviewed commit and public canonical origin, without invitation fragments.
- Confirmed free plans and date, without account identifiers.
- Hosting settings, admission state, and check outcomes.
- Physical-device results and verified shutdown behavior.

Phase 4 remains incomplete until hosted checks and human review are complete.
