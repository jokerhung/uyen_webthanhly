import { test, expect } from "@playwright/test";

test("online buy directly opens its submission form", async ({ page }) => {
  await page.goto("/buy");
  await expect(page.locator(".methods__panel li")).toHaveCount(3);
  await page.getByRole("link", { name: "Thu Mua Online" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/buy\/submit$/);
  await expect(page.getByRole("heading", { name: "Gửi yêu cầu thu mua" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/buy$/);
});

test("clicking Ký Gửi Online directly opens the submission page", async ({ page }) => {
  await page.goto("/consign");
  await page.getByRole("link", { name: "Ký Gửi Online" }).click();
  await expect(page).toHaveURL(/\/consign\/submit$/);
  await expect(page.getByRole("heading", { name: "Gửi hàng ký gửi" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/consign$/);
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
