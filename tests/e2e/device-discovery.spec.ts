import { expect, test } from "@playwright/test";

test.use({ trace: "off", video: "off" });

test("menus load inputs while capture is off and retain the list after a failed refresh", async ({
  page,
}) => {
  await page.goto("/#invite=synthetic.invalid.invitation");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new Error("Discovery must not capture");
      },
    });
    Object.defineProperty(window, "__deviceListMode", { value: "initial", writable: true });
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      configurable: true,
      value: async () => {
        const mode = (window as unknown as { __deviceListMode: string }).__deviceListMode;
        if (mode === "error") throw new DOMException("private browser detail", "NotReadableError");
        return [
          {
            kind: "videoinput",
            deviceId: "test-camera",
            label: mode === "replacement" ? "Replacement camera" : "Test camera",
          },
          { kind: "audioinput", deviceId: "test-microphone", label: "Test microphone" },
        ] as MediaDeviceInfo[];
      },
    });
  });
  await page.getByRole("button", { name: "Camera settings" }).click();
  const camera = page.getByRole("combobox", { name: "Camera", exact: true });
  await expect(camera).toBeEnabled();
  await page.getByRole("button", { name: "Refresh device list" }).focus();
  await page.keyboard.press("Tab");
  await expect(camera).toBeFocused();
  await expect(camera.locator("option")).toHaveText(["Select a device", "Test camera"]);
  await camera.selectOption("test-camera");
  await expect(camera).toHaveValue("test-camera");
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("alert", { name: "Server Error" })).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { __deviceListMode: string }).__deviceListMode = "error";
  });
  await page.getByRole("button", { name: "Refresh device list" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Could not refresh devices" }),
  ).toBeVisible();
  await expect(camera.locator("option")).toHaveText(["Select a device", "Test camera"]);
  await expect(page.locator("body")).not.toContainText("private browser detail");
  await page.evaluate(() => {
    (window as unknown as { __deviceListMode: string }).__deviceListMode = "replacement";
  });
  await page.getByRole("button", { name: "Refresh device list" }).click();
  await expect(camera.locator("option")).toHaveText(["Select a device", "Replacement camera"]);
  await expect(page.getByText(/Could not refresh devices/)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Microphone settings" }).click();
  const microphone = page.getByRole("combobox", { name: "Microphone", exact: true });
  await expect(microphone).toBeEnabled();
  await microphone.selectOption("test-microphone");
  await expect(microphone).toHaveValue("test-microphone");
  await expect(
    page.getByRole("button", { name: "Enable microphone", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("alert", { name: "Server Error" })).toHaveCount(0);
});

test("opening an empty device list reports permission failure without enabling capture", async ({
  page,
}) => {
  await page.goto("/#invite=synthetic.invalid.invitation");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      configurable: true,
      value: async () => [],
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("private detail", "NotAllowedError");
      },
    });
  });
  await page.getByRole("button", { name: "Camera settings" }).click();
  await expect(page.getByRole("combobox", { name: "Camera", exact: true })).toHaveText(
    "No devices listed",
  );
  await expect(
    page.getByRole("dialog", { name: "Camera", exact: true }).getByRole("button"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("status").filter({ hasText: "Camera access was blocked" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("private detail");
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test.describe("mobile input discovery", () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });
  for (const kind of ["camera", "microphone"] as const) {
    test(`${kind} settings request only needed access, retain choices, and release temporary capture`, async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
      await page.evaluate(() => {
        const state = {
          requests: [] as MediaStreamConstraints[],
          stopped: 0,
          capturing: "",
          deny: true,
        };
        Object.defineProperty(window, "__discovery", { value: state });
        Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
          configurable: true,
          value: async () => [
            {
              kind: "videoinput",
              deviceId: state.capturing === "camera" ? "test-camera" : "",
              label: state.capturing === "camera" ? "Test camera" : "",
            },
            {
              kind: "audioinput",
              deviceId: state.capturing === "microphone" ? "test-microphone" : "",
              label: state.capturing === "microphone" ? "Test microphone" : "",
            },
          ],
        });
        Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
          configurable: true,
          value: async (constraints: MediaStreamConstraints) => {
            state.requests.push(constraints);
            if (state.deny) throw new DOMException("Synthetic denial", "NotAllowedError");
            state.capturing = constraints.video ? "camera" : "microphone";
            return {
              getTracks: () => [
                {
                  stop: () => {
                    state.stopped++;
                    state.capturing = "";
                  },
                },
              ],
            };
          },
        });
      });
      await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event("devicechange")));
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __discovery: { requests: unknown[] } }).__discovery.requests
              .length,
        ),
      ).toBe(0);
      const label = kind === "camera" ? "Camera" : "Microphone";
      await page.getByRole("button", { name: `${label} settings` }).tap();
      await expect(
        page.getByRole("status").filter({ hasText: `${label} access was blocked` }),
      ).toBeVisible();
      await page.evaluate(() => {
        (window as unknown as { __discovery: { deny: boolean } }).__discovery.deny = false;
      });
      await page.getByRole("button", { name: "Refresh device list" }).tap();
      const select = page.getByRole("combobox", { name: label, exact: true });
      await expect(select).toBeEnabled();
      await select.selectOption(`test-${kind}`);
      await expect(select).toHaveValue(`test-${kind}`);
      const result = await page.evaluate(
        () =>
          (
            window as unknown as {
              __discovery: {
                requests: MediaStreamConstraints[];
                stopped: number;
                capturing: string;
              };
            }
          ).__discovery,
      );
      expect(result.requests).toEqual([
        { video: kind === "camera", audio: kind === "microphone" },
        { video: kind === "camera", audio: kind === "microphone" },
      ]);
      expect(result.stopped).toBe(1);
      expect(result.capturing).toBe("");
      await expect(
        page.getByRole("button", { name: `Enable ${kind}`, exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event("devicechange")));
      await expect(select).toHaveValue(`test-${kind}`);
      await expect(select.locator("option")).toHaveText(["Select a device", `Test ${kind}`]);
    });
  }
});

test("cancelling device permission stops the late temporary stream", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await page.evaluate(() => {
    const state = { stopped: 0, requested: false };
    Object.defineProperty(window, "__lateDiscovery", { value: state });
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      configurable: true,
      value: async () => [],
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        new Promise((resolve) => {
          state.requested = true;
          Object.defineProperty(window, "__finishDiscovery", {
            value: () => resolve({ getTracks: () => [{ stop: () => state.stopped++ }] }),
          });
        }),
    });
  });
  await page.getByRole("button", { name: "Camera settings" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __lateDiscovery: { requested: boolean } }).__lateDiscovery
            .requested,
      ),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Cancel request" }).click();
  await page.evaluate(() =>
    (window as unknown as { __finishDiscovery: () => void }).__finishDiscovery(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __lateDiscovery: { stopped: number } }).__lateDiscovery.stopped,
      ),
    )
    .toBe(1);
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
