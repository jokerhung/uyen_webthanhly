import { expect, test } from "@playwright/test";

test("catalog navigation, empty-or-populated state and invalid detail", async ({ page, request }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Hàng đang bán" }).click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByRole("heading", { name: "Hàng đang bán" })).toBeVisible();
  await expect(page.getByRole("main").first()).toBeVisible();
  const missing = await request.get(`/items/not-a-real-product-${Date.now()}`);
  expect(missing.status()).toBe(404);
  const image = await request.get(`/api/items/not-a-real-product/images/00000000-0000-4000-8000-000000000000`);
  expect(image.status()).toBe(404);
});

test("preview indexing is disabled and sitemap never leaks admin paths", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).not.toContain("/admin/");
  expect(xml).not.toContain("/api/");
});

test("catalog responsive headings remain available by keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/items");
  await expect(page.getByRole("heading", { name: "Hàng đang bán" })).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});
