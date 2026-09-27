import "server-only";
import { prisma } from "@/lib/db/client";
import { productImageDriver, type ProductImageDriver } from "./product-image-config";

const validKey = (key: string) => /^[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(key);
/** Queue failed rollbacks for scripts/cleanup-images.mjs; never touch current or historical logos. */
export async function queueProductImageCleanup(keys: readonly string[], driver: ProductImageDriver = productImageDriver()) {
  for (const storageKey of keys) {
    if (!validKey(storageKey)) throw new Error("Invalid product image cleanup key");
    const [logo, historic] = await Promise.all([
      prisma.shopSettings.findFirst({ where: { logoKey: storageKey }, select: { id: true } }),
      prisma.adminConfigEvent.findMany({ where: { action: "upload-logo", entityType: "shop_settings" }, select: { before: true, after: true } }),
    ]);
    if (logo || historic.some(event => [event.before, event.after].some(value => !value || typeof value !== "object" || Array.isArray(value) || !("logoKey" in value) || value.logoKey === storageKey))) throw new Error("Product cleanup key is a shop logo or logo audit is incomplete");
    const existing = await prisma.storageCleanupJob.findUnique({ where: { storageKey } });
    if (existing && existing.driver !== driver) throw new Error("Product cleanup driver conflict");
    await prisma.storageCleanupJob.upsert({ where: { storageKey }, create: { storageKey, driver }, update: { status: "pending", nextAttemptAt: new Date(), lastError: null } });
  }
}
