import { test, expect } from "@playwright/test";

test("service modes support mouse and keyboard", async ({ page }) => {
  for (const [route, direct, online] of [["/consign", 4, 5], ["/buy", 3, 4]] as const) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(2);
    await expect(page.getByRole("tabpanel").locator("li")).toHaveCount(direct);
    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel").locator("li")).toHaveCount(online);
  }
});

test("online consign links to form placeholder", async ({ page }) => {
  await page.goto("/consign");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab").nth(1).click();
  await page.getByRole("link", { name: /gửi ký gửi online/i }).click();
  await expect(page).toHaveURL(/\/consign\/submit$/);
});

test("public routes do not overflow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/about", "/consign", "/buy", "/sales"]) {
    await page.goto(route);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(scrollWidth, `${route} must not overflow`).toBeLessThanOrEqual(clientWidth);
  }
});

test("demo settlement clears stale response on input edits", async ({ page }) => {
  await page.goto("/sales");
  await page.waitForLoadState("networkidle");
  const input = page.getByRole("textbox", { name: /số điện thoại/i });
  await input.fill("0000000000");
  await page.getByRole("button", { name: /tìm kiếm/i }).click();
  await expect(page.getByText(/Báo cáo mô phỏng/i)).toBeVisible();
  await input.fill("0912345678");
  await expect(page.getByText(/Báo cáo mô phỏng/i)).toHaveCount(0);
  await page.getByRole("button", { name: /tìm kiếm/i }).click();
  await expect(page.getByText(/Không có dữ liệu mô phỏng/i)).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
});
