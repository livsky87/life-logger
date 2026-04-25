import { expect, test } from "@playwright/test";

const ranges = [1, 7, 30] as const;

for (const days of ranges) {
  test(`timeline visual regression (${days}d)`, async ({ page }) => {
    const date = process.env.PLAYWRIGHT_TIMELINE_DATE ?? "20260424";
    await page.goto(`/timeline?date=${date}&days=${days}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    const timelineRoot = page.locator("div").filter({ hasText: "스케줄 타임라인" }).first();
    await expect(timelineRoot).toBeVisible();

    const view = page.locator('[aria-label="시간대별 활동 밀도(차트와 동일 시간축)"]').first();
    if (days === 1 && (await view.count()) > 0) {
      await expect(view).toBeVisible();
    }

    const chartContainer = page.locator("div").filter({ hasText: /성공 \d+|실패 \d+/ }).first();
    await expect(chartContainer).toBeVisible();
    await expect(chartContainer).toHaveScreenshot(`timeline-${days}d-summary.png`);

    await page.mouse.move(900, 420);
    await page.waitForTimeout(200);
    await page.mouse.move(1020, 420);
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot(`timeline-${days}d-page.png`, {
      fullPage: true,
    });
  });
}
