import { expect, test } from "@playwright/test";

test("item categories are database-backed combobox options", async ({ page }) => {
  await page.goto("/consign/submit");
  const category = page.getByRole("combobox", { name: "Loại mặt hàng" });
  await expect(category).toBeVisible();
  await expect(category.locator("option")).toHaveCount(9);
  await expect(category.locator('option[value="ao-khoac"]')).toHaveText("Áo khoác");
  await expect(category.locator('option[value="legacy-c9afbd87df24ed59189d19040508c7de"]')).toHaveCount(0);
  if (await category.isEnabled()) {
    await category.selectOption("ao-khoac");
    await expect(category).toHaveValue("ao-khoac");
  }
});
