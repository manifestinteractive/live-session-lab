import { expect, test } from "@playwright/test";

test.use({ trace: "off", video: "off" });

for (const role of ["host", "guest"] as const) {
  test(`${role} code links fill access details and exchange only on Join`, async ({
    page,
    context,
  }) => {
    const code = `synthetic-${role}-code-for-link-tests`;
    const requests: string[] = [];
    let exchanges = 0;
    page.on("request", (request) => requests.push(request.url()));
    await page.addInitScript(() => {
      Object.defineProperty(window, "__captureRequests", { value: [] });
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        writable: true,
        value: async () => {
          (window as unknown as { __captureRequests: string[] }).__captureRequests.push("capture");
          throw new Error("Unexpected capture");
        },
      });
    });
    await page.route("**/api/token", async (route) => {
      exchanges++;
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ code, displayName: "Test visitor" });
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "invalid_code" }),
      });
    });
    await page.goto(`/#invite=${encodeURIComponent(code)}`);
    const input = page.getByLabel("Invite code", { exact: true });
    await expect(input).toHaveValue(code);
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).not.toBeEditable();
    await input.focus();
    await page.keyboard.type("replacement");
    await expect(input).toHaveValue(code);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Join session" })).toBeDisabled();
    expect(exchanges).toBe(0);
    await page.getByLabel("What is your name?").fill("Test visitor");
    await page.getByRole("link", { name: "Skip to content" }).focus();
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue(code);
    await page.getByRole("button", { name: "Join session" }).click();
    await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
      "This invite code is not valid",
    );
    expect(exchanges).toBe(1);
    expect(requests.some((url) => url.includes(code))).toBe(false);
    const browserState = await page.evaluate(() => ({
      local: Object.values(localStorage),
      session: Object.values(sessionStorage),
      capture: (window as unknown as { __captureRequests: string[] }).__captureRequests,
    }));
    expect(JSON.stringify(browserState)).not.toContain(code);
    expect(browserState.capture).toEqual([]);
    expect(await context.cookies()).toEqual([]);
    await page.reload();
    await expect(input).toHaveValue("");
    await expect(input).toBeEditable();
  });
}

test("switching between signed invitations and code links replaces the credential", async ({
  page,
}) => {
  const code = "synthetic-replacement-code-for-links";
  const invitation = "synthetic.replacement.invitation";
  const exchanges: unknown[] = [];
  await page.route("**/api/token", async (route) => {
    exchanges.push(route.request().postDataJSON());
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "admission_disabled" }),
    });
  });
  await page.goto("/#invite=synthetic.initial.invitation");
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
  await page.getByLabel("What is your name?").fill("Previous visitor");
  await page.evaluate((value) => {
    location.hash = `invite=${value}`;
  }, code);
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveValue(code);
  await expect(page.getByLabel("Invite code", { exact: true })).not.toBeEditable();
  await expect(page.getByLabel("What is your name?")).toHaveValue("");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "New calls are disabled",
  );
  await page.evaluate((value) => {
    location.hash = `invite=${value}`;
  }, invitation);
  await expect(page.getByLabel("Invite code", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("What is your name?")).toHaveValue("");
  await page.getByLabel("What is your name?").fill("Test visitor");
  await page.getByRole("button", { name: "Join session" }).click();
  await expect(page.getByRole("alert", { name: "Server Error" })).toContainText(
    "New calls are disabled",
  );
  expect(exchanges).toEqual([
    { code, displayName: "Test visitor" },
    { invitation, displayName: "Test visitor" },
  ]);
  expect(new URL(page.url()).hash).toBe("");
});
