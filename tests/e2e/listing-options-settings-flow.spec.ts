import { expect, test } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
test.afterAll(async () => db.$disconnect());
test.describe("managed listing options (disposable database)", () => {
  test.skip(process.env.RUN_OPTIONS_DB_E2E !== "1", "Requires a disposable migrated database");
  test("sequentially manages brand, size, material without changing other kinds or item links", async ({ page, baseURL }) => {
    const origin = `http://localhost:${new URL(baseURL!).port}`;
    const suffix = randomUUID().slice(0, 8);
    const email = `options-${randomUUID()}@example.test`;
    const password = `Fixture-${randomUUID()}`;
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const admin = await db.adminUser.create({ data: { email, active: true, passwordHash: `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}` } });
    const headers = { Origin: origin, "Content-Type": "application/json" };
    expect((await page.request.get(`${origin}/api/admin/settings/brands`)).status()).toBe(401);
    expect((await page.request.post(`${origin}/api/admin/settings/brands`, { headers, data: { name: "Test" } })).status()).toBe(401);
    expect((await page.request.post(`${origin}/api/admin/session`, { headers, data: { email, password } })).status()).toBe(200);
    const options = [
      { route: "brands", kind: "brand", label: "Nhãn hiệu", name: `Áo  Việt ${suffix}`, field: "brandId" },
      { route: "sizes", kind: "size", label: "Kích thước", name: `38 ${suffix}`, field: "sizeId" },
      { route: "materials", kind: "material", label: "Chất liệu", name: `Lụa  Việt ${suffix}`, field: "materialId" },
    ] as const;
    const linked: Record<string, string> = {};
    for (const option of options) {
      const endpoint = `${origin}/api/admin/settings/${option.route}`;
      await page.goto(`${origin}/admin/settings/shop`);
      const adminNav = page.getByRole("navigation", { name: "Quản trị" });
      await adminNav.getByText("Danh mục", { exact: true }).click();
      await adminNav.getByRole("link", { name: option.label }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/settings/${option.route}$`));
      await page.getByRole("button", { name: `Thêm ${option.label.toLowerCase()}`, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: `Thêm ${option.label.toLowerCase()}` });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Hủy" }).click();
      await expect(dialog).not.toBeVisible();
      for (const payload of [{ name: "  " }, { name: option.name, kind: "price" }, { name: option.name, amount: 100 }, { name: option.name, id: "forged" }]) {
        expect((await page.request.post(endpoint, { headers, data: payload })).status()).toBe(422);
      }
      expect((await page.request.post(endpoint, { headers: { Origin: "https://evil.invalid" }, data: { name: option.name } })).status()).toBe(403);
      const add = await page.request.post(endpoint, { headers, data: { name: ` ${option.name} ` } });
      expect(add.status(), await add.text()).toBe(201);
      const row = (await add.json()).category as { slug: string; name: string; sortOrder: number };
      linked[option.field] = row.slug;
      expect(row.name).toBe(option.name.trim().replace(/\s+/g, " ").normalize("NFC"));
      expect((await db.listingOption.findUniqueOrThrow({ where: { id: row.slug } })).amount).toBeNull();
      const duplicate = await page.request.post(endpoint, { headers, data: { name: row.name.toUpperCase() } });
      expect(duplicate.status()).toBe(409);
      const wrongKind = options.find(other => other.kind !== option.kind && linked[other.field]);
      if (wrongKind) expect((await page.request.patch(`${endpoint}/${linked[wrongKind.field]}`, { headers, data: { active: false, expectedActive: true } })).status()).toBe(404);
      await page.getByRole("button", { name: "Tải lại danh sách" }).click();
      await expect(page.getByRole("button", { name: `Xóa ${option.label.toLowerCase()} ${row.name}` })).toBeVisible();
      const patch = `${endpoint}/${row.slug}`;
      expect((await page.request.patch(patch, { headers, data: { active: false, expectedActive: false } })).status()).toBe(422);
      expect((await page.request.patch(patch, { headers, data: { active: false, expectedActive: true, kind: "price" } })).status()).toBe(422);
      const remove = await page.request.patch(patch, { headers, data: { active: false, expectedActive: true } });
      expect(remove.status(), await remove.text()).toBe(200);
      expect((await page.request.patch(patch, { headers, data: { active: false, expectedActive: true } })).status()).toBe(409);
      expect((await page.request.post(endpoint, { headers, data: { name: row.name } })).status()).toBe(409);
      await page.reload();
      await expect(page.getByRole("button", { name: `Khôi phục ${option.label.toLowerCase()} ${row.name}` })).toBeVisible();
      await page.getByRole("button", { name: `Khôi phục ${option.label.toLowerCase()} ${row.name}` }).click();
      await expect(page.getByRole("button", { name: `Xóa ${option.label.toLowerCase()} ${row.name}` })).toBeVisible();
      expect((await db.listingOption.findUniqueOrThrow({ where: { id: row.slug } })).active).toBe(true);
      expect((await db.adminConfigEvent.findMany({ where: { entityType: "listing_option", entityId: row.slug, adminId: admin.id } })).map(event => event.action).sort()).toEqual(["create", "deactivate", "restore"]);
    }
    const consignor = await db.consignor.create({ data: { name: "Test only", phoneNormalized: "0000000000" } });
    const receipt = await db.consignment.create({ data: { publicCode: `OPTIONS-${randomUUID()}`, consignorId: consignor.id } });
    const item = await db.item.create({ data: { consignmentId: receipt.id, slug: `options-${randomUUID()}`, name: "Test item", category: "ao", description: "Test", condition: "Test", status: "PENDING", brandId: linked.brandId, sizeId: linked.sizeId, materialId: linked.materialId } });
    for (const option of options) {
      const patch = `${origin}/api/admin/settings/${option.route}/${linked[option.field]}`;
      expect((await page.request.patch(patch, { headers, data: { active: false, expectedActive: true } })).status()).toBe(200);
    }
    const stored = await db.item.findUniqueOrThrow({ where: { id: item.id }, include: { brand: true, size: true, material: true } });
    for (const option of options) {
      expect(stored[option.field]).toBe(linked[option.field]);
      expect(stored[option.kind]?.label).toBeTruthy();
      const listing = await page.request.get(`${origin}/api/admin/settings/${option.route}`);
      expect((await listing.json()).categories.find((entry: { slug: string }) => entry.slug === linked[option.field]).itemCount).toBe(1);
    }
    const other = await db.listingOption.findFirst({ where: { kind: "season" } });
    expect(other?.active).toBe(true);
  });
});
