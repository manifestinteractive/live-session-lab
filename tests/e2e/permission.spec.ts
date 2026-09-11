import { expect, test } from "@playwright/test";

// Browser-level denial. No fake devices or permission grants are used in this test.
test.use({ trace: "off", video: "off" });
test("browser camera denial gives a usable recovery message", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  await cdp.send("Browser.setPermission", {
    permission: { name: "camera" },
    setting: "denied",
    origin: "http://localhost:3100",
    browserContextId: targetInfo.browserContextId,
  });
  await page.goto("/#invite=synthetic.invalid.invitation");
  expect(
    await page.evaluate(
      async () => (await navigator.permissions.query({ name: "camera" as PermissionName })).state,
    ),
  ).toBe("denied");
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toBeVisible();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "Camera access was blocked",
  );
  await expect(page.getByRole("button", { name: "Enable microphone", exact: true })).toBeEnabled();
});
