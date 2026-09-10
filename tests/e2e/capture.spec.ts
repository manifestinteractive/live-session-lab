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

  test("a cancelled permission request releases its late capture result", async ({ page }) => {
    await page.evaluate(() => {
      const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => {
        Object.defineProperty(window, "__finishPermission", { value: async () => resolve(await capture(constraints)) });
      });
    });
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await page.getByRole("button", { name: "Cancel setup" }).click();
    await page.evaluate(() => (window as unknown as { __finishPermission: () => Promise<void> }).__finishPermission());
    await expect.poll(() => page.evaluate(() => {
      const tracks = (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks;
      return tracks.length > 0 && tracks.every(track => track.readyState === "ended");
    })).toBe(true);
    await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText(/Setup reset\. Capture has stopped/)).toBeVisible();
  });

  test("camera capture recovers after a device error without retaining the alert", async ({ page }) => {
    await page.evaluate(() => {
      const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      let first = true;
      navigator.mediaDevices.getUserMedia = async constraints => {
        if (first) { first = false; throw new DOMException("Synthetic device unavailable", "NotFoundError"); }
        return capture(constraints);
      };
    });
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await expect(page.getByRole("alert", { name: "Action needed" })).toContainText("No camera is available");
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("alert", { name: "Action needed" })).toHaveCount(0);
    await page.getByRole("button", { name: "Exit setup" }).click();
  });

  test("reset permits audio while an earlier camera request is unanswered", async ({ page }) => {
    await page.evaluate(() => {
      const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = constraints => {
        if (!constraints?.video) return capture(constraints);
        return new Promise(resolve => {
          Object.defineProperty(window, "__finishCamera", { value: async () => resolve(await capture(constraints)) });
        });
      };
    });
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    await page.getByRole("button", { name: "Cancel setup" }).click();
    await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
    await expect(page.getByRole("button", { name: "Turn microphone off" })).toBeEnabled();
    await page.evaluate(() => (window as unknown as { __finishCamera: () => Promise<void> }).__finishCamera());
    await expect.poll(() => page.evaluate(() => {
      const tracks = (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks;
      return tracks.some(track => track.kind === "audio" && track.readyState === "live") && tracks.filter(track => track.kind === "video").every(track => track.readyState === "ended");
    })).toBe(true);
    await page.getByRole("button", { name: "Exit setup" }).click();
  });
