import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", video: "off" });

for (const width of [320, 390, 768, 1440]) {
  test(`video overlays stay usable at ${width} pixels and enlarged text`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const stage = page.locator('[data-slot="video-stage"]');
    const controls = stage.getByRole("group");
    await page.goto("/#invite=synthetic.invalid.invitation");
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
    const microphone = page.getByRole("button", { name: "Enable microphone", exact: true });
    const camera = page.getByRole("button", { name: "Enable camera", exact: true });
    await camera.focus();
    await expect(camera).toBeFocused();
    expect(await camera.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
      "solid",
    );
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Camera settings" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(microphone).toBeFocused();
    const outer = (await stage.boundingBox())!;
    const details = page.getByRole("button", { name: "Connection details" });
    for (const button of [microphone, camera, details]) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThan(outer.x);
      expect(box.y).toBeGreaterThan(outer.y);
      expect(box.x + box.width).toBeLessThan(outer.x + outer.width);
      expect(box.y + box.height).toBeLessThan(outer.y + outer.height);
      expect(
        await button.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          );
        }),
      ).toBe(true);
    }
    for (const fontSize of ["100%", "200%"]) {
      const style = await page.addStyleTag({ content: `html { font-size: ${fontSize}; }` });
      const gear = (await details.boundingBox())!;
      const bar = (await controls.boundingBox())!;
      expect(gear.x >= bar.x + bar.width || gear.y + gear.height <= bar.y).toBe(true);
      await details.focus();
      expect(await details.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
        "solid",
      );
      await page.keyboard.press("Enter");
      const popup = page.getByRole("dialog", { name: "Connection details" });
      await expect(popup).toBeVisible();
      await expect(popup).toHaveCSS("opacity", "1");
      await expect(popup.getByText("disconnected", { exact: true })).toBeVisible();
      await expect(popup.getByText("Unavailable", { exact: true })).toBeVisible();
      await expect(popup.locator("dd")).toHaveText([
        "disconnected",
        "0",
        "Unavailable",
        "Off",
        "Off",
      ]);
      const box = (await popup.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(
        (
          await new AxeBuilder({ page })
            .exclude("[data-base-ui-focus-guard]")
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(popup).toBeHidden();
      await expect(details).toBeFocused();
      await style.evaluate((element) => element.parentNode?.removeChild(element));
    }
  });
}

for (const route of ["/", "/#invite=synthetic.invalid.invitation"]) {
  test(`join form and preview have matching heights for ${route.includes("#") ? "signed invitations" : "codes"}`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.locator(".setup-columns")).toBeVisible();
    for (const viewport of [
      { width: 1024, height: 900 },
      { width: 1440, height: 900 },
      { width: 1024, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      for (const fontSize of ["100%", "200%"]) {
        const style = await page.addStyleTag({ content: `html { font-size: ${fontSize}; }` });
        await expect
          .poll(() =>
            page.locator(".setup-columns").evaluate((grid) => {
              const stage = grid
                .querySelector('[data-slot="video-stage"]')!
                .getBoundingClientRect();
              const card = grid.querySelector('[data-slot="card"]')!.getBoundingClientRect();
              return Math.max(Math.abs(stage.y - card.y), Math.abs(stage.height - card.height));
            }),
          )
          .toBeLessThanOrEqual(1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await style.evaluate((element) => element.parentNode?.removeChild(element));
      }
    }
  });
}
