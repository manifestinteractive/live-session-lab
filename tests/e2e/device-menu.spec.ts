import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.use({ trace: "off", video: "off" });

for (const width of [320, 390, 768, 1440]) {
  test(`device menus support keyboard use and enlarged text at ${width} pixels`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      navigator.mediaDevices.enumerateDevices = async () => [];
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Synthetic denial", "NotAllowedError");
      };
    });
    await page.goto("/#invite=synthetic.invalid.invitation");
    await expect(page.getByRole("heading", { name: "Start a conversation" })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    for (const fontSize of ["100%", "200%"]) {
      const style = await page.addStyleTag({ content: `html { font-size: ${fontSize}; }` });
      for (const kind of ["Camera", "Microphone"]) {
        const trigger = page.getByRole("button", { name: `${kind} settings` });
        await trigger.focus();
        expect(await trigger.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
          "solid",
        );
        await page.keyboard.press("Enter");
        const popup = page.getByRole("dialog", { name: kind, exact: true });
        await expect(popup).toBeVisible();
        await expect(popup).toHaveCSS("opacity", "1");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(popup.getByLabel(kind, { exact: true })).toBeDisabled();
        await expect(popup.getByRole("button", { name: "Refresh device list" })).toBeEnabled();
        await popup.getByRole("button", { name: "Refresh device list" }).focus();
        expect(
          await popup
            .getByRole("button", { name: "Refresh device list" })
            .evaluate((element) => element.scrollHeight <= element.clientHeight),
        ).toBe(true);
        const box = (await popup.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        // Base UI 1.8 gives its hidden WebKit focus guards role="button" for VoiceOver.
        // These redirect focus and have no label. Check application controls, and
        // exercise focus movement below. Physical VoiceOver review remains separate.
        expect(
          (
            await new AxeBuilder({ page })
              .exclude("[data-base-ui-focus-guard]")
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.keyboard.press("Tab");
        await expect(popup).toBeHidden();
        await expect(
          kind === "Camera"
            ? page.getByRole("button", { name: "Enable microphone", exact: true })
            : page.getByRole("button", { name: "Connection details" }),
        ).toBeFocused();
        await trigger.focus();
        await page.keyboard.press("Enter");
        await expect(popup).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(popup).toBeHidden();
        await expect(trigger).toBeFocused();
      }
      await style.evaluate((element) => element.parentNode?.removeChild(element));
    }
    await page.getByRole("button", { name: "Camera settings" }).click();
    await page.getByRole("heading", { name: "Start a conversation" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Leave session" })).toHaveCount(0);
  });
}
