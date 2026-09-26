import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
test.afterAll(async () => { await prisma.$disconnect(); });

test.describe("category settings on isolated database", () => {
  test.skip(process.env.RUN_CATEGORY_DB_E2E !== "1", "Requires disposable migrated DB");
  test("protects mutations and preserves item links through deactivate/restore", async ({ page, baseURL }) => {
    const origin = `http://localhost:${new URL(baseURL!).port}`;
    const url = `${origin}/api/admin/settings/categories`;
    expect((await page.request.get(url)).status()).toBe(401);
    expect((await page.request.post(url, { data: { name: "Giày" } })).status()).toBe(401);
    await page.goto(`${origin}/admin/settings/categories`);
    await expect(page).toHaveURL(/\/admin\/login$/);
    const unique = randomUUID();
    const email = `category-admin-${unique}@example.test`;
    const password = `Fixture-${randomUUID()}`;
    const salt = randomBytes(16);
    const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const admin = await prisma.adminUser.create({ data: { email, active: true, passwordHash: `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}` } });
    const headers = { Origin: origin, "Content-Type": "application/json" };
    expect((await page.request.post(`${origin}/api/admin/session`, { headers, data: { email, password } })).status()).toBe(200);
    await page.goto(`${origin}/admin/settings/shop`);
    await page.getByRole("navigation", { name: "Quản trị" }).getByRole("link", { name: "Loại sản phẩm" }).click();
    await expect(page).toHaveURL(/\/admin\/settings\/categories$/);
    await expect(page.getByRole("heading", { name: "Loại sản phẩm", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Thêm loại sản phẩm", exact: true }).click();
    const addDialog = page.getByRole("dialog", { name: "Thêm loại sản phẩm" });
    await expect(addDialog).toBeVisible();
    await addDialog.getByRole("button", { name: "Hủy" }).click();
    await expect(addDialog).toHaveCount(0);
    const categoryName = `Áo khoác ${unique.slice(0, 8)}`; // decomposed accent to exercise NFC
    for (const payload of [{ name: "  " }, { name: "x".repeat(101) }, { name: categoryName, slug: "forged" }, { name: categoryName, adminId: admin.id }, { name: categoryName, kind: "brand" }]) {
      expect((await page.request.post(url, { headers, data: payload })).status()).toBe(422);
    }
    expect((await page.request.post(url, { headers: { Origin: "https://evil.invalid" }, data: { name: categoryName } })).status()).toBe(403);
    const added = await page.request.post(url, { headers, data: { name: `  ${categoryName.replace(" ", "\u00a0  ")}  ` } });
    expect(added.status(), await added.text()).toBe(201);
    const category = (await added.json()).category;
    expect(category.name).toBe(`Áo khoác ${unique.slice(0, 8)}`);
    expect(category.slug).toMatch(/^[a-z0-9-]+$/);
    expect((await page.request.post(url, { headers, data: { name: `  ÁO   KHOÁC ${unique.slice(0, 8)} ` } })).status()).toBe(409);
    expect(await prisma.itemCategory.count({ where: { normalizedName: category.name.toLowerCase() } })).toBe(1);
    const consignor = await prisma.consignor.create({ data: { name: "Fake Category Customer", phoneNormalized: "0000000000" } });
    const receipt = await prisma.consignment.create({ data: { publicCode: `CATEGORY-${unique}`, consignorId: consignor.id } });
    const item = await prisma.item.create({ data: { consignmentId: receipt.id, slug: `category-${unique}`, name: "Fake Category Item", category: category.slug, description: "Fake", condition: "Fake", status: "PENDING" } });
    const rowUrl = `${url}/${encodeURIComponent(category.slug)}`;
    expect((await page.request.patch(rowUrl, { headers, data: { active: false, expectedActive: false } })).status()).toBe(422);
    expect((await page.request.patch(rowUrl, { headers: { Origin: "https://evil.invalid" }, data: { active: false, expectedActive: true } })).status()).toBe(403);
    await page.getByRole("button", { name: "Tải lại danh sách" }).click();
    await expect(page.getByRole("button", { name: `Xóa loại sản phẩm ${category.name}` })).toBeVisible();
    await page.getByRole("button", { name: `Xóa loại sản phẩm ${category.name}` }).click();
    await expect(page.getByText("Có 1 mặt hàng tham chiếu.")).toBeVisible();
    await page.getByRole("button", { name: `Xác nhận xóa “${category.name}”` }).click();
    await expect(page.getByRole("button", { name: `Khôi phục loại sản phẩm ${category.name}` })).toBeVisible();
    expect((await page.request.patch(rowUrl, { headers, data: { active: false, expectedActive: true } })).status()).toBe(409);
    expect((await page.request.post(url, { headers, data: { name: category.name } })).status()).toBe(409);
    await page.goto(`${origin}/buy/submit`);
    await expect(page.locator(`select option[value="${category.slug}"]`)).toHaveCount(0);
    await page.goto(`${origin}/items?category=${category.slug}`);
    await expect(page).toHaveURL(new RegExp("/items"));
    expect((await prisma.item.findUniqueOrThrow({ where: { id: item.id } })).category).toBe(category.slug);
    await page.goto(`${origin}/admin/settings/categories`);
    await page.getByRole("button", { name: `Khôi phục loại sản phẩm ${category.name}` }).click();
    await expect(page.getByRole("button", { name: `Xóa loại sản phẩm ${category.name}` })).toBeVisible();
    expect((await prisma.itemCategory.findUniqueOrThrow({ where: { slug: category.slug } })).active).toBe(true);
    await page.goto(`${origin}/buy/submit`);
    await expect(page.locator(`select option[value="${category.slug}"]`)).toHaveCount(1);
    const events = await prisma.adminConfigEvent.findMany({ where: { entityType: "item_category", entityId: category.slug, adminId: admin.id }, orderBy: { createdAt: "asc" } });
    expect(events.map(event => event.action).sort()).toEqual(["create", "deactivate", "restore"]);
    expect(events.find(event => event.action === "deactivate")?.after).toMatchObject({ active: false });
  });
});
