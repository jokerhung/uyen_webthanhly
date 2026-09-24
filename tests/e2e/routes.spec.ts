import { test, expect } from "@playwright/test";

const routes = ["/", "/about", "/consign", "/buy", "/sales", "/consign/submit", "/items", "/items/demo", "/admin/login", "/admin/items", "/admin/items/demo", "/admin/consignments", "/admin/consignments/demo"];
for (const route of routes) {
  test(`skeleton loads ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
  });
}
