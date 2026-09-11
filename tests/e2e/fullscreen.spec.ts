import { expect, test, type Page } from "@playwright/test";
import type { CallSession } from "@/lib/call-session";

test.use({ trace: "off", video: "off" });

// Use the SDK's simulated room only. No provider admission or real media is requested.
async function joinSimulatedCall(page: Page) {
  await page.route("**/api/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ serverUrl: "wss://synthetic.invalid", token: "synthetic" }),
    }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toHaveCount(0);
  await page.evaluate(() => {
    // The development test server exposes React fibers; keep this fixture outside application code.
    type Fiber = { memoizedProps?: { session?: CallSession }; return?: Fiber };
    const stage = document.querySelector('[data-slot="video-stage"]')!;
    const key = Object.keys(stage).find((key) => key.startsWith("__reactFiber$"))!;
    let fiber: Fiber | undefined = (stage as unknown as Record<string, Fiber>)[key];
    while (fiber && !fiber.memoizedProps?.session) fiber = fiber.return;
    const session = fiber?.memoizedProps?.session;
    if (!session) throw new Error("Simulated call fixture could not find its session");
    session.join = async () =>
      session.room.simulateParticipants({
        publish: { audio: false, video: true, useRealTracks: false },
        participants: { count: 1, audio: false, video: false },
      });
  });
  await page.getByLabel("Invite code", { exact: true }).fill("synthetic-code-for-fullscreen");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeVisible();
}

test("expanded view preserves 16:9 through rotation and keeps menus and keyboard access", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
  });
  await joinSimulatedCall(page);
  const stage = page.locator('[data-slot="video-stage"]');
  const enter = page.getByRole("button", { name: "Enter fullscreen" });
  const video = page.getByRole("region", { name: "Your media" }).locator("video");
  await expect(video).toBeVisible();
  await video.evaluate((element) => {
    (window as unknown as { __fullscreenVideo: Element }).__fullscreenVideo = element;
  });
  await enter.click();
  const exit = page.getByRole("button", { name: "Exit fullscreen" });
  await expect(exit).toBeFocused();
  expect(await page.locator("header").evaluate((element) => !!element.closest("[inert]"))).toBe(
    true,
  );
  for (const viewport of [
    { width: 320, height: 900 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(stage).toHaveCSS("background-color", "rgb(0, 0, 0)");
    const frame = (await stage.locator(".video-stage-surface").boundingBox())!;
    expect(Math.abs(frame.width / frame.height - 16 / 9)).toBeLessThan(0.01);
    expect(frame.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(frame.height).toBeLessThanOrEqual(viewport.height + 1);
    const control = (await exit.boundingBox())!;
    expect(control.width).toBeGreaterThanOrEqual(44);
    expect(control.x).toBeGreaterThanOrEqual(0);
    expect(control.y + control.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await exit.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        return button.contains(
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
        );
      }),
    ).toBe(true);
  }
  await exit.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Turn camera off", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Connection details", exact: true }).click();
  const popup = page.getByRole("dialog", { name: "Connection details", exact: true });
  await expect(popup).toBeVisible();
  expect(await popup.evaluate((element) => !!element.closest("[data-expanded]"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(exit).toBeVisible();
  await exit.click();
  await expect(enter).toBeFocused();
  await expect(stage).not.toHaveAttribute("data-expanded");
  expect(await page.locator("header").evaluate((element) => !!element.closest("[inert]"))).toBe(
    false,
  );
  await enter.click();
  await page.keyboard.press("Escape");
  await expect(enter).toBeFocused();
  expect(
    await video.evaluate(
      (element) =>
        element === (window as unknown as { __fullscreenVideo: Element }).__fullscreenVideo,
    ),
  ).toBe(true);
  await enter.click();
  await page.getByRole("button", { name: "Leave session" }).click();
  await page.getByRole("button", { name: "Leave call", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await expect(page.getByRole("button", { name: /fullscreen/i })).toHaveCount(0);
  expect(await page.locator("header").evaluate((element) => !!element.closest("[inert]"))).toBe(
    false,
  );
});

test("native fullscreen tracks browser exit and contains its popovers", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Native fullscreen is checked in Chromium; fallback is checked in both engines.",
  );
  await joinSimulatedCall(page);
  const stage = page.locator('[data-slot="video-stage"]');
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-slot")))
    .toBe("video-stage");
  await page.getByRole("button", { name: "Connection details", exact: true }).click();
  const popup = page.getByRole("dialog", { name: "Connection details", exact: true });
  await expect(popup).toBeVisible();
  expect(await popup.evaluate((element) => document.fullscreenElement?.contains(element))).toBe(
    true,
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    document.fullscreenElement ? document.exitFullscreen() : Promise.resolve(),
  );
  await expect(stage).not.toHaveAttribute("data-expanded");
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeFocused();
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole("button", { name: "Leave session" }).click();
  await page.getByRole("button", { name: "Stay in call", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole("button", { name: "Leave session" }).click();
  await page.getByRole("button", { name: "Leave call", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await expect(stage).not.toHaveAttribute("data-expanded");
  await expect(page.getByRole("button", { name: /fullscreen/i })).toHaveCount(0);
  await expect(page.getByLabel("What is your name?")).toBeEditable();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("a rejected native request still permits expanded view and exit", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    HTMLElement.prototype.requestFullscreen = async () => {
      throw new TypeError("Synthetic rejection");
    };
  });
  await joinSimulatedCall(page);
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect(page.getByRole("dialog", { name: "Fullscreen video", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  expect(await page.locator("header").evaluate((element) => !!element.closest("[inert]"))).toBe(
    false,
  );
});
