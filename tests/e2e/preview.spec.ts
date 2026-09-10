import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("preview navigation never captures media or submits the test name", async ({ page, context, baseURL }) => {
  const errors: string[] = [];
  const failedRequests: string[] = [];
  const requests: { method: string; url: string; body: string }[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => failedRequests.push(request.url()));
  page.on("request", (request) => requests.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" }));
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(window, "__mediaCalls", { value: calls });
    for (const method of ["getUserMedia", "enumerateDevices", "getDisplayMedia"]) {
      if (navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices, method, {
        value: () => { calls.push(method); return Promise.reject(new Error("Capture is forbidden in Phase 1")); },
      });
    }
  });
  await page.goto("/");
  await expect(page.getByRole("note")).toContainText("Disconnected demonstration");
  await page.getByLabel("Temporary display name").fill("Synthetic visitor");
  await page.getByLabel("Temporary display name").press("Enter");
  await expect(page.getByRole("button", { name: "Join session" })).toBeDisabled();
  await expect(page.getByLabel("Camera", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Microphone", { exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Explore room preview" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Room preview");
  await expect(page.getByRole("button", { name: "Camera off" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Microphone off" })).toBeDisabled();
  await expect(page.locator("details")).not.toHaveAttribute("open");
  await page.getByText("Connection details", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Unavailable, no SDK connection")).toBeVisible();
  await expect(page.getByText("Connected participants", { exact: true }).locator("..")).toContainText("0");
  expect(await page.evaluate(() => (window as unknown as { __mediaCalls: string[] }).__mediaCalls)).toEqual([]);
  await page.getByRole("link", { name: "Exit preview" }).click();
  await expect(page.getByLabel("Temporary display name")).toHaveValue("");
  await page.getByLabel("Temporary display name").fill("Synthetic visitor");
  await page.reload();
  await expect(page.getByLabel("Temporary display name")).toHaveValue("");
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  expect(await context.cookies()).toEqual([]);
  expect(requests.filter((request) => request.method === "POST" || request.url.includes("Synthetic") || request.body.includes("Synthetic"))).toEqual([]);
  expect(requests.filter((request) => new URL(request.url).origin !== baseURL)).toEqual([]);
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("keyboard navigation exposes focus and reaches the setup and room", async ({ page, browserName }) => {
  // macOS WebKit uses Option+Tab to include links in keyboard navigation.
  const next = browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  await page.keyboard.press(next);
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press(next);
  await expect(page.getByLabel("Temporary display name")).toBeFocused();
  expect(await page.getByLabel("Temporary display name").evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("solid");
  await page.keyboard.press(next);
  await expect(page.getByRole("link", { name: "Explore room preview" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Room preview" })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  for (const path of ["/", "/room"]) {
    test(`${path} fits width ${width} and passes automated accessibility checks`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(scan.violations).toEqual([]);
      const targets = page.locator('a:visible:not(.skip-link), input:enabled, summary');
      for (const target of await targets.all()) {
        const box = await target.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });
  }
}

test("both screens reflow after rotation and 200 percent text zoom", async ({ page }) => {
  for (const path of ["/", "/room"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await page.setViewportSize({ width: 844, height: 390 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole("link", { name: path === "/" ? "Explore room preview" : "Exit preview" })).toBeVisible();
  }
});
