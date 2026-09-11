import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ trace: "off", video: "off" });

for (const [errorName, message] of [
  ["NotAllowedError", "Camera access was blocked"],
  ["NotFoundError", "No camera is available"],
  ["NotReadableError", "Camera could not start"],
  ["OverconstrainedError", "Camera is unavailable"],
]) {
  test(`recovers the controls after ${errorName} without exposing browser error text`, async ({
    page,
  }) => {
    await page.goto("/#invite=synthetic.invalid.invitation");
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
    await page.evaluate((name) => {
      // Isolate hardware error handling from the test browser's permission defaults.
      Object.defineProperty(navigator.permissions, "query", {
        configurable: true,
        value: async () => ({ state: "prompt" }),
      });
      Object.defineProperty(MediaDevices.prototype, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("synthetic-private-device-detail", name);
        },
      });
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("synthetic-private-device-detail", name);
        },
      });
    }, errorName);
    await page.getByRole("button", { name: "Enable camera", exact: true }).click();
    const alert = page.getByRole("alert", { name: "Server Error" });
    await expect(alert).toContainText(message);
    await expect(alert).toContainText("use audio only");
    await expect(alert).toBeFocused();
    await expect(page.getByText("synthetic-private-device-detail")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Enable microphone", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
  });
}

test("device refresh does not request capture and diagnostics expose no credentials", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "__captureCalls", { value: 0, writable: true });
    navigator.mediaDevices.getUserMedia = async () => {
      (window as unknown as { __captureCalls: number }).__captureCalls++;
      throw new Error("Unexpected capture");
    };
  });
  const response = await page.goto("/#invite=synthetic.invalid.invitation");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(response?.headers()["permissions-policy"]).toContain("camera=(self)");
  await page.evaluate(() => {
    navigator.mediaDevices.enumerateDevices = async () =>
      [
        { kind: "videoinput", deviceId: "synthetic-camera", label: "Test camera" },
      ] as MediaDeviceInfo[];
  });
  await page.getByRole("button", { name: "Camera settings" }).click();
  await page.getByRole("button", { name: "Refresh device list" }).click();
  await page.keyboard.press("Escape");
  await page.evaluate(() => navigator.mediaDevices.dispatchEvent(new Event("devicechange")));
  await page.getByRole("button", { name: "Connection details", exact: true }).click();
  await expect(page.getByText("Unavailable", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { __captureCalls: number }).__captureCalls),
  ).toBe(0);
  await expect(page.locator("body")).not.toContainText("synthetic.invalid.invitation");
});

test("a stalled admission request can be cancelled without losing the invitation", async ({
  page,
}) => {
  await page.route("**/api/token", () => new Promise(() => {}));
  await page.goto("/#invite=synthetic.invalid.invitation");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.getByRole("button", { name: "Join session" }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await expect(page.getByLabel("What is your name?")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toBeEnabled();
  await page.unrouteAll({ behavior: "ignoreErrors" });
});
