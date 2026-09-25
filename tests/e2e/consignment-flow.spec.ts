import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";

const pngPromise = sharp({ create: { width: 8, height: 8, channels: 3, background: "#b8b8b8" } }).png().toBuffer();
const prisma = new PrismaClient();
test.afterAll(async () => { await prisma.$disconnect(); });

async function multipart(name: string, intakeType: "consign" | "buy", withImage = true, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("name", name); form.set("phone", "0912345678"); form.set("consent", "true"); form.set("intakeType", intakeType);
  form.set("items", JSON.stringify([{ name: "Sản phẩm giả thử nghiệm", category: "ao", description: "Dữ liệu mô phỏng", condition: "Đã sử dụng", desiredPrice: 100000, ...extra }]));
  if (withImage) form.append("images.0", new File([new Uint8Array(await pngPromise)], "fake.png", { type: "image/png" }));
  return form;
}

test.describe("isolated synthetic intake", () => {
  test.skip(process.env.RUN_INTAKE_DB_E2E !== "1", "Requires disposable DB and explicitly enabled policy for synthetic tests");
  test("valid receipt is atomic, pending and idempotent", async ({ baseURL }) => {
    const key = randomUUID(); const name = `ĐẶC BIỆT TEST ${key}`;
    const intakeType: "consign" | "buy" = "consign";
    const origin = `http://localhost:${new URL(baseURL!).port}`;
    const headers = { Origin: origin, "Idempotency-Key": key };
    const url = `${baseURL}/api/consignments`;
    try {
      const first = await fetch(url, { method: "POST", headers, body: await multipart(name, intakeType) });
      expect(first.status, await first.clone().text()).toBe(201);
      const { public_code: code } = await first.json();
      expect(code).toMatch(/^HUN-[A-F0-9]{32}$/);
      const replay = await fetch(url, { method: "POST", headers, body: await multipart(name, intakeType) });
      expect(replay.status).toBe(200);
      expect((await replay.json()).public_code).toBe(code);
      const rejected = await fetch(url, { method: "POST", headers, body: await multipart(`${name}-DIFFERENT`, intakeType) });
      expect(rejected.status).toBe(409);
      const receipt = await prisma.consignment.findUnique({ where: { publicCode: code }, include: { items: { include: { images: true } }, consignor: true } });
      expect(receipt?.intakeType).toBe("CONSIGN");
      expect(receipt?.items).toHaveLength(1);
      expect(receipt?.items[0].status).toBe("PENDING");
      expect(receipt?.items[0].salePrice).toBeNull();
      expect(receipt?.items[0].images).toHaveLength(1);
      expect(receipt?.consignor.name).toBe(name);
      expect(await prisma.intakeRequest.count({ where: { key } })).toBe(1);
      const buyKey = randomUUID();
      const buyName = `THU MUA TEST ${buyKey}`;
      const buyResponse = await fetch(url, { method: "POST", headers: { Origin: origin, "Idempotency-Key": buyKey }, body: await multipart(buyName, "buy") });
      expect(buyResponse.status, await buyResponse.clone().text()).toBe(201);
      const { public_code: buyCode } = await buyResponse.json();
      const buyReceipt = await prisma.consignment.findUnique({ where: { publicCode: buyCode }, include: { items: true } });
      expect(buyReceipt?.intakeType).toBe("BUY");
      expect(buyReceipt?.items).toHaveLength(1);
      expect(buyReceipt?.items[0].status).toBe("PENDING");
      const invalid = await fetch(url, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID() }, body: await multipart("Invalid", intakeType, false, { status: "APPROVED" }) });
      expect(invalid.status).toBe(422);
      expect(await prisma.consignor.count({ where: { name: "Invalid" } })).toBe(0);
    } finally {
      // Do not remove records here: these checks must not affect existing DB data.
      // Only run against a disposable database/volume and reset it after the test.
    }
  });
});
