import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { PrismaClient, type ItemStatus } from "@prisma/client";
import { cleanupPrivateImages, storePrivateImage } from "../../src/lib/storage/images";

const prisma = new PrismaClient();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64");

test.afterAll(async () => { await prisma.$disconnect(); });

test.describe("public catalog in disposable database", () => {
  test.skip(process.env.RUN_CATALOG_DB_E2E !== "1", "Only run against an isolated disposable DB and private image storage");

  test("approved consignment alone is public; image and admin transitions respect visibility and privacy", async ({ page, baseURL, playwright }) => {
    const suffix = randomUUID();
    const privateName = `PRIVATE_CONSIGNOR_${suffix}`;
    const privatePhone = `PRIVATE_${suffix.slice(0, 20)}`;
    const adminEmail = `catalog-admin-${suffix}@example.test`;
    const password = `FixtureOnly-${randomUUID()}`;
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const origin = `http://localhost:${new URL(baseURL!).port}`;
    await prisma.itemCategory.upsert({ where: { slug: "ao" }, update: {}, create: { slug: "ao", name: `Catalog category ${suffix}`, normalizedName: `catalog category ${suffix}` } });
    await prisma.adminUser.create({ data: {
      email: adminEmail, active: true,
      passwordHash: `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`,
    } });
    const consignor = await prisma.consignor.create({ data: { name: privateName, phoneNormalized: privatePhone } });
    const consign = await prisma.consignment.create({ data: { publicCode: `CAT-C-${suffix}`, consignorId: consignor.id, intakeType: "CONSIGN" } });
    const buy = await prisma.consignment.create({ data: { publicCode: `CAT-B-${suffix}`, consignorId: consignor.id, intakeType: "BUY" } });
    const stored = await storePrivateImage(png);
    const records: { slug: string; name: string; id: string; imageId: string }[] = [];
    try {
      async function makeItem(label: string, status: ItemStatus, consignmentId = consign.id) {
        const slug = `catalog-${label}-${suffix}`;
        const name = `Catalog ${label} ${suffix}`;
        const item = await prisma.item.create({ data: {
          consignmentId, slug, name, category: "ao", condition: "Fixture condition", description: "Fixture description",
          status, ...(status === "APPROVED" ? { salePrice: 120000, publishedAt: new Date() } : {}),
        } });
        // A distinct private key per row lets us test image authorization for every status.
        const image = await prisma.itemImage.create({ data: { itemId: item.id, storageKey: label === "approved" ? stored.storageKey : `${randomBytes(32).toString("hex")}.png`, altText: name } });
        const record = { slug, name, id: item.id, imageId: image.id };
        records.push(record);
        return record;
      }
      const approved = await makeItem("approved", "APPROVED");
      const excluded = await Promise.all([
        makeItem("pending", "PENDING"), makeItem("rejected", "REJECTED"),
        makeItem("sold", "SOLD"), makeItem("hidden", "HIDDEN"),
        makeItem("buy", "APPROVED", buy.id),
      ]);
      const imageUrl = (record: typeof approved) => `/api/items/${record.slug}/images/${record.imageId}`;
      const assertNoPrivateData = (body: string) => {
        expect(body).not.toContain(privateName);
        expect(body).not.toContain(privatePhone);
        expect(body).not.toContain(consign.publicCode);
        expect(body).not.toContain(buy.publicCode);
        expect(body).not.toContain(stored.storageKey);
      };
      const anonymous = await playwright.request.newContext({ baseURL: origin });
      try {
        const listing = await anonymous.get("/items");
        expect(listing.status()).toBe(200);
        const listHtml = await listing.text();
        expect(listHtml).toContain(approved.name);
        expect(listHtml).toContain(approved.slug);
        for (const item of excluded) {
          expect(listHtml).not.toContain(item.name);
          expect(listHtml).not.toContain(item.slug);
          const detail = await anonymous.get(`/items/${item.slug}`);
          expect(detail.status(), `${item.slug} detail must be 404`).toBe(404);
          assertNoPrivateData(await detail.text());
          const image = await anonymous.get(imageUrl(item));
          expect(image.status(), `${item.slug} image must be 404`).toBe(404);
        }
        assertNoPrivateData(listHtml);
        const detail = await anonymous.get(`/items/${approved.slug}`);
        expect(detail.status()).toBe(200);
        const detailHtml = await detail.text();
        expect(detailHtml).toContain(approved.name);
        expect(detailHtml).toContain("120.000");
        assertNoPrivateData(detailHtml);
        await page.goto(`/items/${approved.slug}`);
        await expect(page.getByText(approved.name).first()).toBeVisible();
        const configuredShopPhone = process.env.SHOP_PHONE?.trim();
        if (configuredShopPhone && /^\+?[\d\s().-]{8,25}$/.test(configuredShopPhone)) {
          await expect(page.locator(`a[href="tel:${configuredShopPhone.replace(/[^\d+]/g, "")}"]`)).toBeVisible();
        }
        const publicImage = await anonymous.get(imageUrl(approved));
        expect(publicImage.status()).toBe(200);
        expect(publicImage.headers()["content-type"]).toContain("image/png");
        expect(publicImage.headers()["x-content-type-options"]).toBe("nosniff");
        expect(await publicImage.body()).toEqual(png);
        expect((await anonymous.get(`/api/items/${excluded[0].slug}/images/${approved.imageId}`)).status()).toBe(404);
        expect((await anonymous.get(`/api/items/${approved.slug}/images/${randomUUID()}`)).status()).toBe(404);
        expect((await anonymous.get(`/api/items/${approved.slug}/images/not-a-uuid`)).status()).toBe(404);
        expect((await anonymous.get(`/api/admin/images/${stored.storageKey}`)).status()).toBe(401);

        const login = await page.request.post(`${origin}/api/admin/session`, { headers: { Origin: origin }, data: { email: adminEmail, password } });
        expect(login.status(), await login.text()).toBe(200);
        const headers = { Origin: origin, "Content-Type": "application/json" };
        for (const target of ["sold"] as const) {
          const candidate = await makeItem(`transition-${target}-${randomBytes(3).toString("hex")}`, "PENDING");
          const url = `${origin}/api/admin/items/${candidate.id}`;
          async function change(action: string, expectedStatus: ItemStatus, salePrice?: number) {
            const response = await page.request.patch(url, { headers, data: { action, expectedStatus, ...(salePrice ? { salePrice } : {}) } });
            expect(response.status(), `${action}: ${await response.text()}`).toBe(200);
          }
          await change("negotiate", "PENDING");
          await change("receive", "NEGOTIATING");
          await change("approve", "RECEIVED", 130000);
          const newlyPublic = await anonymous.get(`/items/${candidate.slug}`);
          expect(newlyPublic.status()).toBe(200);
          assertNoPrivateData(await newlyPublic.text());
          const newlyListed = await anonymous.get("/items");
          expect(await newlyListed.text()).toContain(candidate.name);
          await change(target, "APPROVED");
          const removedListing = await anonymous.get("/items");
          expect(await removedListing.text()).not.toContain(candidate.name);
          expect((await anonymous.get(`/items/${candidate.slug}`)).status()).toBe(404);
          expect((await anonymous.get(imageUrl(candidate))).status()).toBe(404);
        }
        expect((await anonymous.get(`/items/${approved.slug}`)).status()).toBe(200);
      } finally {
        await anonymous.dispose();
      }
    } finally {
      // Database is disposable; only delete the one private image file created by this test.
      await cleanupPrivateImages([stored.storageKey]);
      // Database rows (including audit records) remain until the disposable DB is dropped.
    }
  });
});
