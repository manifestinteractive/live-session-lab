---
name: browser-validation
description: Inspect and test Live Session Lab UI changes with Playwright MCP, screenshots, keyboard checks, and separate real-media evidence.
---

# Browser validation

Read `planning-docs/validation.md` for required cases and the result record.
Use the configured `playwright` MCP server on a local test instance.
If unavailable, run `npm ci`, `npm run ai:browser:install`, and `npm run ai:mcp:smoke` to check the installation.
New MCP configuration needs a new trusted Codex session. A shell MCP smoke check does not activate tools in an existing session.
The MCP browser uses an isolated profile. It does not use the user's normal browser session.

For a UI change, start the app with its documented command. Inspect its accessibility snapshot and rendered screenshot.
Use browser_take_screenshot and actually view the resulting image. A saved image alone is not visual review.
Check widths of 320, 390, 768, and 1440 pixels, plus rotation and 200% text zoom.
Check shadcn/ui control composition, contrast, visible focus, and usable touch targets.
Use observed accessible names to choose controls.
Exercise keyboard focus, labels, toggle states, and status announcements. Inspect console errors and failed requests.
Fix relevant issues and repeat affected checks. Save synthetic evidence under `artifacts/` with descriptive filenames.
Keep repeatable regression tests in the application test suite; MCP exploration does not replace those tests.

UI checks and mocked connections must not claim real media transport.
For media work, test preview ownership, leaving, rejoining, permissions, and audio-only behavior.
Use separate browser contexts for participant isolation. A tab alone does not prove session isolation.
Fake devices support repeatable automation. Never report them as proof of physical devices or real audio/video transport.
Do not enable fake permission grants for permission-denial tests.
Avoid screenshots, traces, or network dumps containing invitation credentials, tokens, or real display names.

Record physical-device tests separately, including date, browsers, devices, outcome, and untested cases.
Cover two devices with headphones, permission recovery, device changes, interruption, leave/rejoin, keyboard use, and Chrome.
Required physical targets are Chrome and Safari on the Mac, plus Safari on the iPhone.
Record unavailable checks as blocked or not run. Playwright WebKit alone does not prove Safari or iOS behavior.
