import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LoggerNames } from "livekit-client";

// Invitation-bearing requests must never enter Playwright traces or video evidence.
test.use({ trace: "off", video: "off" });

for (const width of [320, 390, 768, 1440]) {
  for (const invited of [false, true]) {
    test(`private setup at ${width}, invitation ${invited}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(invited ? "/call#invite=synthetic-invalid-invitation" : "/call");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(invited ? "Before you join" : "An invitation is required");
      expect(new URL(page.url()).hash).toBe("");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
      if (invited) {
        await expect(page.getByRole("button", { name: "Enable camera", exact: true })).toHaveAttribute("aria-pressed", "false");
        await expect(page.getByRole("button", { name: "Enable microphone", exact: true })).toHaveAttribute("aria-pressed", "false");
        await expect(page.getByRole("button", { name: "Join session" })).toBeDisabled();
      }
    });
  }
}

test("admission stays protected and invitation credentials stay in memory", async ({ page, context }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/call#invite=synthetic-invalid-invitation");
  await page.getByLabel("Temporary display name").fill("Test visitor");
  await expect(page).toHaveURL(/\/call$/);
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("alert", { name: "Action needed" })).toContainText("New calls are disabled");
  const storage = await page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage)), session: sessionStorage.length }));
  // LiveKit's official logging API persists only its non-sensitive log levels.
  expect(storage).toEqual({ local: Object.fromEntries([...Object.values(LoggerNames), "lk-components-js"].map((name) => [`loglevel:${name}`, "SILENT"])), session: 0 });
  expect(await context.cookies()).toEqual([]);
  expect(requests.some((url) => url.includes("synthetic-invalid") || url.includes("visitor"))).toBe(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "An invitation is required" })).toBeVisible();
});

test("private setup reflows at 200 percent text and landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/call#invite=synthetic-invalid-invitation");
  await expect(page.getByLabel("Temporary display name")).toBeVisible();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.addStyleTag({ content: "html { font-size: 100%; }" });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("a new invitation on the current page is removed and replaces the previous setup", async ({ page }) => {
  await page.goto("/call");
  await expect(page.getByRole("heading", { name: "An invitation is required" })).toBeVisible();
  await page.evaluate(() => { location.hash = "invite=synthetic-invalid-invitation"; });
  await expect(page.getByRole("heading", { name: "Before you join" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.getByLabel("Temporary display name").fill("Test visitor");
  await page.evaluate(() => { location.hash = "invite=another-synthetic-invalid-invitation"; });
  await expect(page.getByLabel("Temporary display name")).toHaveValue("");
  expect(new URL(page.url()).hash).toBe("");
});
