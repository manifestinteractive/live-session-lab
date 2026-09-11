import { expect, test } from "@playwright/test";

test.use({
  trace: "off",
  video: "off",
  permissions: ["camera", "microphone"],
  launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
});
test.beforeEach(async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Synthetic device flags are specific to Chromium.");
  await page.addInitScript(() => {
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const tracks: MediaStreamTrack[] = [];
    const requests: (MediaStreamConstraints | undefined)[] = [];
    Object.defineProperty(window, "__captureTracks", { value: tracks });
    Object.defineProperty(window, "__captureRequests", { value: requests });
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      requests.push(constraints);
      const stream = await capture(constraints);
      tracks.push(...stream.getTracks());
      return stream;
    };
  });
  await page.goto("/#invite=synthetic.invalid.invitation");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
});

test("explicit preview captures once and failed admission stops every track", async ({ page }) => {
  expect(
    await page.evaluate(
      () => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn microphone off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.length,
    ),
  ).toBe(2);
  await page.getByRole("button", { name: "Camera settings" }).click();
  await expect(page.getByRole("combobox", { name: "Camera", exact: true })).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.length,
    ),
  ).toBe(2);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Microphone settings" }).click();
  const input = page.getByRole("combobox", { name: "Microphone", exact: true });
  const current = await input.inputValue();
  // The first synthetic input also appears under the system-default alias.
  // Use the last input to select a distinct synthetic microphone.
  const alternate = await input.locator("option").evaluateAll(
    (options, selected) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value && value !== selected)
        .at(-1),
    current,
  );
  expect(alternate).toBeTruthy();
  await input.selectOption(alternate!);
  await expect(input).toBeEnabled();
  // Chromium's synthetic audio keeps reporting the default device. Verify the
  // selected ID reaches SDK capture, and display the device it actually reports.
  expect(
    await page.evaluate(
      () =>
        (
          (
            window as unknown as { __captureRequests: MediaStreamConstraints[] }
          ).__captureRequests.at(-1)?.audio as MediaTrackConstraints
        ).deviceId,
    ),
  ).toBe(alternate);
  const actual = await page.evaluate(
    () =>
      (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks
        .at(-1)
        ?.getSettings().deviceId,
  );
  await expect(input).toHaveValue(actual!);
  await expect(page.getByRole("button", { name: "Turn microphone off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "New calls are disabled",
  );
  expect(
    await page.evaluate(() =>
      (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every(
        (track) => track.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("microphone-only preview can be stopped before joining", async ({ page }) => {
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn microphone off" })).toBeVisible();
  for (const label of ["Turn camera off", "Turn microphone off"]) {
    const control = page.getByRole("button", { name: label, exact: true });
    if (await control.count()) await control.click();
  }
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() =>
      (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every(
        (track) => track.kind === "audio" && track.readyState === "ended",
      ),
    ),
  ).toBe(true);
});

test("a device chosen while capture is off is used when preview starts", async ({ page }) => {
  await page.getByRole("button", { name: "Camera settings" }).click();
  const input = page.getByRole("combobox", { name: "Camera", exact: true });
  await expect(input).toBeEnabled();
  const deviceId = await input
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value).find(Boolean),
    );
  expect(deviceId).toBeTruthy();
  await input.selectOption(deviceId!);
  expect(
    await page.evaluate(
      () => (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.length,
    ),
  ).toBe(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn camera off" })).toBeEnabled();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks
          .at(-1)
          ?.getSettings().deviceId,
    ),
  ).toBe(deviceId);
  for (const label of ["Turn camera off", "Turn microphone off"]) {
    const control = page.getByRole("button", { name: label, exact: true });
    if (await control.count()) await control.click();
  }
  expect(
    await page.evaluate(() =>
      (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every(
        (track) => track.readyState === "ended",
      ),
    ),
  ).toBe(true);
});

test("turning off preview releases capture and can be enabled again", async ({ page }) => {
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await page.getByRole("button", { name: "Turn camera off" }).click();
  expect(
    await page.evaluate(() =>
      (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.every(
        (track) => track.readyState === "ended",
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const label of ["Turn camera off", "Turn microphone off"]) {
    const control = page.getByRole("button", { name: label, exact: true });
    if (await control.count()) await control.click();
  }
});

test("a cancelled permission request releases its late capture result", async ({ page }) => {
  await page.evaluate(() => {
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (constraints) =>
      new Promise((resolve) => {
        Object.defineProperty(window, "__finishPermission", {
          value: async () => resolve(await capture(constraints)),
        });
      });
  });
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await page.evaluate(() =>
    (window as unknown as { __finishPermission: () => Promise<void> }).__finishPermission(),
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const tracks = (window as unknown as { __captureTracks: MediaStreamTrack[] })
          .__captureTracks;
        return tracks.length > 0 && tracks.every((track) => track.readyState === "ended");
      }),
    )
    .toBe(true);
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
});

test("camera capture recovers after a device error without retaining the alert", async ({
  page,
}) => {
  await page.evaluate(() => {
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let first = true;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (first) {
        first = false;
        throw new DOMException("Synthetic device unavailable", "NotFoundError");
      }
      return capture(constraints);
    };
  });
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "No camera is available",
  );
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("alert", { name: "Server Error" })).toHaveCount(0);
  for (const label of ["Turn camera off", "Turn microphone off"]) {
    const control = page.getByRole("button", { name: label, exact: true });
    if (await control.count()) await control.click();
  }
});

test("cancellation permits audio while an earlier camera request is unanswered", async ({
  page,
}) => {
  await page.evaluate(() => {
    const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (!constraints?.video) return capture(constraints);
      return new Promise((resolve) => {
        Object.defineProperty(window, "__finishCamera", {
          value: async () => resolve(await capture(constraints)),
        });
      });
    };
  });
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn microphone off" })).toBeEnabled();
  await page.evaluate(() =>
    (window as unknown as { __finishCamera: () => Promise<void> }).__finishCamera(),
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const tracks = (window as unknown as { __captureTracks: MediaStreamTrack[] })
          .__captureTracks;
        return (
          tracks.some((track) => track.kind === "audio" && track.readyState === "live") &&
          tracks
            .filter((track) => track.kind === "video")
            .every((track) => track.readyState === "ended")
        );
      }),
    )
    .toBe(true);
  for (const label of ["Turn camera off", "Turn microphone off"]) {
    const control = page.getByRole("button", { name: label, exact: true });
    if (await control.count()) await control.click();
  }
});

test("skip to content preserves an active preview and its invitation", async ({ page }) => {
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Turn camera off" })).toBeEnabled();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByRole("button", { name: "Turn camera off" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
  const tracks = await page.evaluate(() =>
    (window as unknown as { __captureTracks: MediaStreamTrack[] }).__captureTracks.map(
      (track) => track.readyState,
    ),
  );
  expect(tracks).toEqual(["live"]);
  for (const label of ["Turn camera off", "Turn microphone off"]) {
    const control = page.getByRole("button", { name: label, exact: true });
    if (await control.count()) await control.click();
  }
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toBeEnabled();
});
