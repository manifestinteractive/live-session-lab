import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", video: "off" });

test("home offers private admission without automatic capture", async ({ page, context }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__mediaCalls", { value: calls });
    if (navigator.mediaDevices) {
      for (const method of ["getUserMedia", "enumerateDevices", "getDisplayMedia"]) {
        Object.defineProperty(navigator.mediaDevices, method, {
          configurable: true,
          writable: true,
          value: () => {
            calls.push(method);
            return Promise.reject(new Error("Unexpected automatic media request"));
          },
        });
      }
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connecting people.");
  await expect(page.getByText("Let's connect", { exact: true })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("For test conversations only.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  await page.getByLabel("What is your name?").fill("Synthetic visitor");
  await expect(page.getByRole("button", { name: "Join session" })).toBeDisabled();
  await page.getByLabel("Invite code", { exact: true }).fill("synthetic-home-guest-code");
  await expect(page.getByRole("button", { name: "Join session" })).toBeEnabled();
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByLabel("What is your name?")).toHaveValue("Synthetic visitor");
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveValue(
    "synthetic-home-guest-code",
  );
  expect(
    await page.evaluate(() => (window as unknown as { __mediaCalls: string[] }).__mediaCalls),
  ).toEqual([]);
  expect(
    requests.some(
      (url) => url.includes("synthetic") || url.includes("visitor") || url.includes("/api/token"),
    ),
  ).toBe(false);
  await page.reload();
  await expect(page.getByLabel("What is your name?")).toHaveValue("");
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveValue("");
  expect(await context.cookies()).toEqual([]);
  expect(errors).toEqual([]);
});

test("keyboard navigation reaches the working controls and entry fields", async ({
  page,
  browserName,
}) => {
  const next = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await page.keyboard.press(next);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  for (const label of [
    "Enable camera",
    "Camera settings",
    "Enable microphone",
    "Microphone settings",
    "Connection details",
  ]) {
    await page.keyboard.press(next);
    await expect(page.getByRole("button", { name: label, exact: true })).toBeFocused();
  }
  await page.keyboard.press(next);
  await expect(page.getByLabel("What is your name?")).toBeFocused();
  await page.keyboard.press(next);
  await expect(page.getByLabel("Invite code", { exact: true })).toBeFocused();
  expect(
    await page
      .getByLabel("Invite code", { exact: true })
      .evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
});

test("signed invitation admission does not leak the fragment", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route("**/api/token", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      invitation: "synthetic.signed.invitation",
      displayName: "Test visitor",
    });
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "admission_disabled" }),
    });
  });
  await page.goto("/#invite=synthetic.signed.invitation");
  await expect(page.getByLabel("What is your name?")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.getByLabel("What is your name?")).toHaveValue("Test visitor");
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "New calls are disabled",
  );
  expect(requests.some((url) => url.includes("synthetic.signed"))).toBe(false);
});

for (const width of [320, 390, 768, 1440]) {
  test(`home fits width ${width} and passes accessibility checks`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    const targets = page.locator(
      "a:visible:not(.skip-link), input:enabled, button:enabled:not([data-nextjs-dev-tools-button])",
    );
    for (const target of await targets.all()) {
      const box = await target.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
}
