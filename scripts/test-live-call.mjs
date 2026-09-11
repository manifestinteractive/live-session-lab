// Opt-in provider test. Uses synthetic media and consumes the configured project allowance.
import { LiveKitAPI } from "livekit-server-sdk";
import { createInvitationPair } from "../src/lib/server/invitations.mjs";
import { mkdir, writeFile } from "node:fs/promises";
process.env.PLAYWRIGHT_BROWSERS_PATH = process.cwd() + "/.cache/ms-playwright";
const { chromium, expect } = await import("@playwright/test");
const recovery = process.argv.includes("--recovery");
const layout = process.argv.includes("--layout");
const codes = process.argv.includes("--codes");
const credentialLabel = codes ? "code" : "invitation";
let invitations, room;
try {
  if (codes) {
    room = process.env.CALL_ROOM_NAME;
    // Code tests must use the isolated server and temporary room supplied by the wrapper.
    if (
      !room ||
      room !== process.env.TEST_CALL_ROOM_NAME ||
      !process.env.HOST_INVITE_CODE ||
      !process.env.GUEST_INVITE_CODE
    )
      throw new Error();
  } else
    ({ invitations, room } = await createInvitationPair(process.env.INVITATION_SIGNING_SECRET));
  new URL(process.env.APP_ORIGIN);
  new URL(process.env.LIVEKIT_URL);
} catch {
  console.error("Live test configuration is missing or invalid.");
  process.exit(1);
}
await mkdir("artifacts/playwright", { recursive: true });
const origin = process.env.APP_ORIGIN;
const urls = codes
  ? [new URL("/", origin), new URL("/", origin)]
  : invitations.map((invite) => {
      const url = new URL("/", origin);
      url.hash = new URLSearchParams({ invite }).toString();
      return url;
    });
const host = new URL(process.env.LIVEKIT_URL);
host.protocol = "https:";
const api = new LiveKitAPI({
  host: host.origin,
  apiKey: process.env.LIVEKIT_API_KEY,
  secret: process.env.LIVEKIT_API_SECRET,
});
let browser;
let stage = "browser startup";
const results = [];
const pages = [];
try {
  browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  stage = "browser context creation";

  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({
      permissions: ["camera", "microphone"],
      viewport: { width: i === 1 ? 390 : 1440, height: 900 },
    });
    const page = await context.newPage();
    pages.push(page);
    await page.addInitScript(() => {
      const NativeSocket = window.WebSocket;
      const sockets = [];
      Object.defineProperty(window, "__signalSockets", { value: sockets });
      window.WebSocket = class extends NativeSocket {
        constructor(...args) {
          super(...args);
          sockets.push(this);
        }
      };
      const NativePeer = window.RTCPeerConnection;
      const peers = [];
      Object.defineProperty(window, "__testPeers", { value: peers });
      window.RTCPeerConnection = class extends NativePeer {
        constructor(...args) {
          super(...args);
          peers.push(this);
        }
      };
      const tracks = [];
      Object.defineProperty(window, "__captureTracks", { value: tracks });
      const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (options) => {
        const stream = await capture(options);
        tracks.push(...stream.getTracks());
        return stream;
      };
    });
    stage = "opening the join form";
    await page.goto(urls[i === 1 ? 1 : 0].href);
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
    if (new URL(page.url()).hash) throw new Error("Fragment retained");
    if (codes)
      await page
        .getByLabel("Invite code", { exact: true })
        .fill(i === 1 ? process.env.GUEST_INVITE_CODE : process.env.HOST_INVITE_CODE);
    await page.getByLabel("What is your name?").fill("Test visitor");
  }
  if (codes) {
    await pages[0].reload();
    await expect(pages[0].getByLabel("Invite code", { exact: true })).toHaveValue("");
    await pages[0].getByLabel("Invite code", { exact: true }).fill(process.env.HOST_INVITE_CODE);
    await pages[0].getByLabel("What is your name?").fill("Test visitor");
  }
  for (let i = 0; i < 2; i++) {
    stage = "joining participant " + (i + 1);
    const page = pages[i];
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn camera off" })).toBeVisible();
    await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn microphone off" })).toBeVisible();
    await page.getByRole("button", { name: "Join session" }).click();
    await expect(page.getByRole("button", { name: "Leave session" })).toBeVisible({
      timeout: 30000,
    });
  }
  if (layout) {
    stage = "video overlay layout";
    const beforeMenus = await pages[0].evaluate(() => window.__captureTracks.length);
    for (const kind of ["Camera", "Microphone"]) {
      await pages[0].getByRole("button", { name: kind + " settings" }).click();
      const menu = pages[0].getByRole("dialog", { name: kind, exact: true });
      await expect(menu.getByLabel(kind, { exact: true })).toBeEnabled();
      await expect(pages[0].getByRole("button", { name: "Leave session" })).toBeEnabled();
      await pages[0].keyboard.press("Escape");
      await expect(menu).toBeHidden();
    }
    if ((await pages[0].evaluate(() => window.__captureTracks.length)) !== beforeMenus)
      throw new Error("Device menus requested capture");
    results.push(
      "Both device menus opened during the call without additional capture. Input selectors and Leave remained enabled. Escape closed each menu.",
    );

    for (const width of [320, 390, 768, 1440]) {
      await pages[0].setViewportSize({ width, height: 900 });
      const frame = pages[0].locator('[data-slot="video-stage"]');
      const remote = pages[0].getByRole("region", { name: "Remote participant media" });
      const local = pages[0].getByRole("region", { name: "Your media" });
      await expect(remote.locator("video")).toBeVisible({ timeout: 20000 });
      await expect(local.locator("video")).toBeVisible();
      const outer = await frame.boundingBox(),
        small = await local.boundingBox();
      if (
        !outer ||
        !small ||
        small.width >= outer.width / 2 ||
        small.x <= outer.x + outer.width / 2
      )
        throw new Error("Invalid local inset geometry");
      for (const label of [
        "Turn microphone off",
        "Microphone settings",
        "Turn camera off",
        "Camera settings",
        "Leave session",
      ]) {
        const button = pages[0].getByRole("button", { name: label });
        await button.scrollIntoViewIfNeeded();
        const box = await button.boundingBox(),
          bounds = await frame.boundingBox();
        if (
          !box ||
          !bounds ||
          box.width < 44 ||
          box.height < 44 ||
          box.x < bounds.x ||
          box.y < bounds.y ||
          box.x + box.width > bounds.x + bounds.width ||
          box.y + box.height > bounds.y + bounds.height
        )
          throw new Error("Invalid overlay control geometry");
      }
      if (!(await pages[0].evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
        throw new Error("Horizontal overflow");
      await pages[0].screenshot({
        path: `artifacts/playwright/video-overlay-live-${width}.png`,
        fullPage: true,
      });
    }
    await pages[0].setViewportSize({ width: 390, height: 844 });
    await pages[0].evaluate(() => (document.documentElement.style.fontSize = "200%"));
    if (!(await pages[0].evaluate(() => document.documentElement.scrollWidth <= innerWidth)))
      throw new Error("Enlarged text overflow");
    await pages[0].screenshot({
      path: "artifacts/playwright/video-overlay-live-zoom.png",
      fullPage: true,
    });
    await pages[0].evaluate(() => (document.documentElement.style.fontSize = ""));
    await pages[0].setViewportSize({ width: 844, height: 390 });
    await pages[0].screenshot({
      path: "artifacts/playwright/video-overlay-live-landscape.png",
      fullPage: true,
    });
    await pages[0].setViewportSize({ width: 1440, height: 900 });
    const captures = await pages[0].evaluate(() => window.__captureTracks.length);
    if (captures !== 2) throw new Error("Layout changes requested additional capture");
    results.push(
      "Remote video remained the main view and local video stayed inset at all four widths. Overlay controls met 44-pixel targets. Enlarged text had no horizontal overflow. Layout changes requested no extra capture.",
    );
  }
  stage = "remote video playback";
  for (const page of pages.slice(0, 2)) {
    const video = page.getByRole("region", { name: "Remote participant media" }).locator("video");
    await expect(video).toBeVisible({ timeout: 20000 });
    await expect
      .poll(() => video.evaluate((v) => v.videoWidth > 0 && v.currentTime > 0), { timeout: 15000 })
      .toBe(true);
    await expect(page.locator("audio")).toHaveCount(1);
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            let received = false;
            for (const peer of window.__testPeers) {
              const stats = await peer.getStats();
              stats.forEach((report) => {
                if (
                  report.type === "inbound-rtp" &&
                  report.kind === "audio" &&
                  report.bytesReceived > 0
                )
                  received = true;
              });
            }
            return received;
          }),
        { timeout: 15000 },
      )
      .toBe(true);
  }
  results.push(
    "Two isolated browser participants connected; remote video decoded in both directions and inbound audio RTP bytes were received in both directions.",
  );
  stage = "SDK mute propagation";
  await pages[0].getByRole("button", { name: "Turn camera off" }).click();
  await expect(
    pages[0].getByRole("button", { name: "Enable camera", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    pages[1]
      .getByRole("region", { name: "Remote participant media" })
      .getByText("Camera is off", { exact: true }),
  ).toBeVisible();
  await pages[0].getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(
    pages[1].getByRole("region", { name: "Remote participant media" }).locator("video"),
  ).toBeVisible();
  await pages[0].getByRole("button", { name: "Turn microphone off" }).click();
  await expect(
    pages[0].getByRole("button", { name: "Enable microphone", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  results.push(
    "Camera mute and unmute propagated to the remote interface; microphone control reflected SDK mute state.",
  );
  await pages[0].screenshot({
    path: "artifacts/playwright/live-desktop.png",
    fullPage: true,
  });
  await pages[1].screenshot({
    path: "artifacts/playwright/live-mobile.png",
    fullPage: true,
  });
  if (recovery) {
    stage = "audio-only participation";
    await pages[0].getByRole("button", { name: "Enable microphone", exact: true }).click();
    for (const page of pages.slice(0, 2)) {
      await page.getByRole("button", { name: "Turn camera off" }).click();
      await expect(
        page.getByText("Audio-only call. Your camera is off.", { exact: true }),
      ).toBeVisible();
    }
    for (const page of pages.slice(0, 2)) await expect(page.locator("video")).toHaveCount(0);
    const audioBytes = (page) =>
      page.evaluate(async () => {
        let bytes = 0;
        for (const peer of window.__testPeers) {
          if (peer.connectionState === "closed") continue;
          const stats = await peer.getStats();
          stats.forEach((report) => {
            if (report.type === "inbound-rtp" && report.kind === "audio")
              bytes += report.bytesReceived ?? 0;
          });
        }
        return bytes;
      });
    for (const page of pages.slice(0, 2)) {
      const baseline = await audioBytes(page);
      await expect.poll(() => audioBytes(page), { timeout: 10000 }).toBeGreaterThan(baseline);
    }
    results.push(
      "Both participants switched to audio-only mode. Video elements were removed and inbound audio RTP bytes continued increasing in both directions.",
    );
    stage = "signaling interruption";
    await pages[0].context().setOffline(true);
    await pages[0].evaluate(() =>
      window.__signalSockets
        .filter((socket) => socket.readyState === 1)
        .forEach((socket) => socket.close()),
    );
    await expect(
      pages[0].getByText(
        "Connection interrupted. LiveKit is reconnecting. Media may pause; you can leave at any time.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 15000 });
    await expect(pages[0].getByRole("button", { name: "Leave session" })).toBeEnabled();
    await expect(pages[0].getByRole("button", { name: "Turn microphone off" })).toBeDisabled();
    await pages[0].screenshot({
      path: "artifacts/playwright/live-reconnecting.png",
      fullPage: true,
    });
    await pages[0].context().setOffline(false);
    await expect(pages[0].getByText("Connection restored.", { exact: true })).toBeVisible({
      timeout: 45000,
    });
    await expect(pages[0].getByRole("button", { name: "Turn microphone off" })).toBeEnabled();
    const resumedBytes = await audioBytes(pages[0]);
    await expect.poll(() => audioBytes(pages[0]), { timeout: 15000 }).toBeGreaterThan(resumedBytes);
    results.push(
      "After browser network emulation and signaling closure, the SDK showed reconnection, kept Leave available, and restored the session. Inbound audio continued afterward.",
    );
    await pages[1].screenshot({
      path: "artifacts/playwright/live-audio-only-mobile.png",
      fullPage: true,
    });
  }
  stage = "invitation reuse";
  await pages[2].getByRole("button", { name: "Join session" }).click();
  await expect(pages[2].getByRole("button", { name: "Leave session" })).toBeVisible({
    timeout: 30000,
  });
  await expect(pages[0].getByRole("heading", { name: "Start a conversation" })).toBeVisible({
    timeout: 15000,
  });
  await expect(pages[0].getByRole("button", { name: "Leave session" })).toHaveCount(0);
  await expect
    .poll(() =>
      pages[0].evaluate(() => window.__captureTracks.every((t) => t.readyState === "ended")),
    )
    .toBe(true);
  await expect
    .poll(
      async () => {
        const participants = await api.room.listParticipants(room);
        return {
          count: participants.length,
          identities: new Set(participants.map((p) => p.identity)).size,
        };
      },
      { timeout: 15000 },
    )
    .toEqual({ count: 2, identities: 2 });
  await expect(pages[1].getByRole("button", { name: "Leave session" })).toBeVisible();
  results.push(
    "Reusing the first " +
      credentialLabel +
      " replaced its original connection and stopped its capture. The second participant remained connected. The provider listed two distinct identities.",
  );
  await pages[0].screenshot({ path: "artifacts/playwright/live-replaced.png", fullPage: true });
  stage = "leave and rejoin";
  await pages[2].getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(pages[2].getByRole("button", { name: "Turn camera off" })).toBeVisible();
  await pages[2].getByRole("button", { name: "Leave session" }).click();
  await expect(pages[2].getByRole("alertdialog", { name: "Leave this call?" })).toBeVisible();
  await pages[2].getByRole("button", { name: "Stay in call" }).click();
  await expect(pages[2].getByRole("button", { name: "Leave session", exact: true })).toBeVisible();
  await expect.poll(async () => (await api.room.listParticipants(room)).length).toBe(2);
  if (
    !(await pages[2].evaluate(() =>
      window.__captureTracks.some((track) => track.readyState === "live"),
    ))
  )
    throw new Error("Stay stopped active capture");
  await pages[2].getByRole("button", { name: "Leave session" }).click();
  await pages[2].getByRole("button", { name: "Leave call", exact: true }).click();
  await expect(pages[2].getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await expect(pages[2].getByLabel("What is your name?")).toHaveValue("");
  await expect(pages[2].getByLabel("Invite code", { exact: true })).toHaveValue("");
  await expect(pages[2].getByRole("button", { name: "Join session" })).toBeDisabled();
  await expect
    .poll(() =>
      pages[2].evaluate(() =>
        window.__captureTracks.every((track) => track.readyState === "ended"),
      ),
    )
    .toBe(true);
  results.push(
    "Stay retained the active call. Confirmed leave returned to a blank join form and stopped capture.",
  );
  await expect(
    pages[1].getByText("Waiting for the other participant", { exact: true }),
  ).toBeVisible();
  await pages[0].getByRole("button", { name: "Join session" }).click();
  await expect(pages[0].getByRole("button", { name: "Leave session" })).toBeVisible({
    timeout: 30000,
  });
  await expect(pages[1].getByRole("region", { name: "Remote participant media" })).toHaveCount(1);
  results.push(
    "Leaving updated remote presence. Rejoin with the participant-specific " +
      credentialLabel +
      " succeeded with capture off.",
  );
  stage = "room deletion";
  await api.room.deleteRoom(room);
  for (const page of pages.slice(0, 2)) {
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible({
      timeout: 15000,
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__captureTracks.every((t) => t.readyState === "ended")),
      )
      .toBe(true);
  }
  results.push("Deleting the active room disconnected both participants and stopped capture.");
  stage = "room recreation";
  await Promise.all(
    pages.slice(0, 2).map(async (page) => {
      await page.getByRole("button", { name: "Join session" }).click();
      await expect(page.getByRole("button", { name: "Leave session" })).toBeVisible({
        timeout: 30000,
      });
    }),
  );
  await expect
    .poll(
      async () => {
        const participants = await api.room.listParticipants(room);
        return {
          count: participants.length,
          identities: new Set(participants.map((p) => p.identity)).size,
        };
      },
      { timeout: 15000 },
    )
    .toEqual({ count: 2, identities: 2 });
  for (const page of pages.slice(0, 2))
    await expect(page.getByRole("region", { name: "Remote participant media" })).toHaveCount(1);
  results.push(
    "Both participant credentials rejoined after deletion with concurrent requests. The provider listed two distinct identities.",
  );
  const recreated = (await api.room.listRooms([room]))[0];
  results.push(
    recreated?.maxParticipants === 2
      ? "The recreated room also reported maxParticipants=2."
      : "Room configuration listing remains inconsistent; identity admission does not depend on that listing.",
  );
  stage = "recreated room invitation reuse";
  if (codes) {
    await pages[2].getByLabel("Invite code", { exact: true }).fill(process.env.HOST_INVITE_CODE);
  } else {
    await pages[2].goto(urls[0].href);
  }
  await pages[2].getByLabel("What is your name?").fill("Test visitor");
  await pages[2].getByRole("button", { name: "Join session" }).click();
  await expect(pages[2].getByRole("button", { name: "Leave session" })).toBeVisible({
    timeout: 30000,
  });
  await expect(pages[0].getByRole("heading", { name: "Start a conversation" })).toBeVisible({
    timeout: 15000,
  });
  await expect
    .poll(async () => (await api.room.listParticipants(room)).length, { timeout: 15000 })
    .toBe(2);
  results.push(
    "Credential reuse after room recreation again replaced its connection and left two participants.",
  );
} catch {
  results.push("FAILED during " + stage + ". Credential-bearing errors are suppressed.");
  process.exitCode = 1;
} finally {
  try {
    await browser?.close();
  } catch {
    results.push("Browser cleanup failed; verify that the test browser stopped.");
    process.exitCode = 1;
  }
  try {
    await api.room.deleteRoom(room);
    results.push("The temporary provider room was deleted.");
  } catch (error) {
    if (["not_found", "not-found"].includes(error.code))
      results.push("No temporary provider room remained.");
    else {
      console.error(
        "Temporary room cleanup requires verification. Provider status:",
        ["unauthenticated", "permission_denied", "unavailable", "not_found"].includes(error.code)
          ? error.code
          : "unclassified",
      );
      process.exitCode = 1;
    }
  }
  await writeFile(
    codes
      ? "artifacts/live-code-results.json"
      : layout
        ? "artifacts/live-layout-results.json"
        : recovery
          ? "artifacts/live-recovery-results.json"
          : "artifacts/live-provider-results.json",
    JSON.stringify(
      { date: new Date().toISOString(), results, passed: process.exitCode !== 1 },
      null,
      2,
    ),
  );
  for (const result of results) console.log(result);
}
