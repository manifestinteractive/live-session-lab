import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LoggerNames } from "livekit-client";

// Invitation-bearing requests must never enter Playwright traces or video evidence.
test.use({ trace: "off", video: "off" });

for (const width of [320, 390, 768, 1440]) {
  for (const invited of [false, true]) {
    test(`join form at ${width}, invitation ${invited}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(invited ? "/#invite=synthetic.invalid.invitation" : "/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Connecting people.Exploring what’s possible.",
      );
      expect(new URL(page.url()).hash).toBe("");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
          .violations,
      ).toEqual([]);
      await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(invited ? 0 : 1);
      if (invited) {
        await expect(
          page.getByRole("button", { name: "Enable camera", exact: true }),
        ).toHaveAttribute("aria-pressed", "false");
        await expect(
          page.getByRole("button", { name: "Enable microphone", exact: true }),
        ).toHaveAttribute("aria-pressed", "false");
        await expect(page.getByRole("button", { name: "Join session" })).toBeDisabled();
      }
    });
  }
}

test("admission stays protected and invitation credentials stay in memory", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/#invite=synthetic.invalid.invitation");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "New calls are disabled",
  );
  const storage = await page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)),
    session: sessionStorage.length,
  }));
  // LiveKit's official logging API persists only its non-sensitive log levels.
  expect(storage).toEqual({
    local: Object.fromEntries(
      [...Object.values(LoggerNames), "lk-components-js"].map((name) => [
        `loglevel:${name}`,
        "SILENT",
      ]),
    ),
    session: 0,
  });
  expect(await context.cookies()).toEqual([]);
  expect(requests.some((url) => url.includes("synthetic.invalid") || url.includes("visitor"))).toBe(
    false,
  );
  await page.reload();
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
});

test("join form reflows at 200 percent text and landscape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("What is your name?")).toBeVisible();
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const card = page.locator('[data-slot="card"]');
    for (const content of [
      card,
      card.getByRole("heading"),
      card.getByRole("button", { name: "Join session" }),
    ]) {
      expect(
        await content.evaluate(
          (element) =>
            element.scrollWidth <= element.clientWidth &&
            element.scrollHeight <= element.clientHeight,
        ),
      ).toBe(true);
    }
  }
  await page.addStyleTag({ content: "html { font-size: 100%; }" });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a new invitation on the current page is removed and clears the previous join details", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  await page.evaluate(() => {
    location.hash = "invite=synthetic.invalid.invitation";
  });
  await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.evaluate(() => {
    location.hash = "invite=another-synthetic.invalid.invitation";
  });
  await expect(page.getByLabel("What is your name?")).toHaveValue("");
  expect(new URL(page.url()).hash).toBe("");
});

test("invite code entry uses a POST, supports correction, and clears on reload", async ({
  page,
  context,
}) => {
  const code = "synthetic-guest-code-for-browser-tests";
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  const input = page.getByLabel("Invite code", { exact: true });
  await expect(input).toHaveAttribute("type", "text");
  await page.getByLabel("What is your name?").fill("Test visitor");
  const join = page.getByRole("button", { name: "Join session" });
  await expect(join).toBeDisabled();
  await input.fill(code);
  await expect(join).toBeEnabled();
  await page.route("**/api/token", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ code, displayName: "Test visitor" });
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_code" }),
    });
  });
  await join.click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "This invite code is not valid",
  );
  await input.fill("synthetic-corrected-code-for-tests");
  await expect(join).toBeEnabled();
  const storage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain(code);
  expect(await context.cookies()).toEqual([]);
  expect(requests.some((url) => url.includes(code))).toBe(false);
  await page.reload();
  await expect(input).toHaveValue("");
  await expect(join).toBeDisabled();
});
