import { expect, test } from "@playwright/test";

  test.use({ trace: "off", video: "off", permissions: ["camera", "microphone"], launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } });
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Synthetic device flags are specific to Chromium.");
    await page.addInitScript(() => {
      const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      const tracks: MediaStreamTrack[] = [];
      Object.defineProperty(window, "__captureTracks", { value: tracks });
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await capture(constraints);
        tracks.push(...stream.getTracks());
        return stream;
      };
    });
    await page.goto("/call#invite=synthetic-invalid-invitation");
    await expect(page.getByRole("heading", { name: "Before you join" })).toBeVisible();
  });

  test("explicit preview captures once and failed admission stops every track", async ({ page }) => {
    expect(await page.evaluate(() => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.length)).toBe(0);
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn microphone off" })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.length)).toBe(2);
    await expect(page.getByLabel("Camera", { exact: true })).toBeEnabled();
    await page.getByLabel("Temporary display name").fill("Test visitor");
    await page.getByRole("button", { name: "Join session" }).click();
    await expect(page.getByRole("alert", { name: "Action needed" })).toContainText("New calls are disabled");
    expect(await page.evaluate(() => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every((track) => track.readyState === "ended"))).toBe(true);
    await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute("aria-pressed", "false");
  });

  test("microphone-only preview is released on exit", async ({ page }) => {
    await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn microphone off" })).toBeVisible();
    await page.getByRole("button", { name: "Exit setup" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every((track) => track.kind === "audio" && track.readyState === "ended"))).toBe(true);
  });

  test("turning off preview releases capture and can be enabled again", async ({ page }) => {
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await page.getByRole("button", { name: "Turn camera off" }).click();
    expect(await page.evaluate(() => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every((track) => track.readyState === "ended"))).toBe(true);
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Exit setup" }).click();
  });
