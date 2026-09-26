import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { ShopSettingsInput } from "./validation";

export type ShopSettings = {
  id: number; shopName: string; slogan: string; announcementText: string; announcementEnabled: boolean; primaryColor: string; backgroundColor: string; surfaceColor: string;
  address: string; facebookUrl: string; phone: string; opensAt: string; closesAt: string;
  version: number; updatedAt: Date; updatedById: string | null;
};

/** Migration inserts the only settings row; missing data is an operator error, not a silent reset. */
export async function getShopSettings(): Promise<ShopSettings> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error("ShopSettings row is missing; run prisma migrate deploy");
  return settings;
}

const auditSnapshot = (settings: ShopSettings) => ({ shopName: settings.shopName, slogan: settings.slogan, primaryColor: settings.primaryColor,
  backgroundColor: settings.backgroundColor, surfaceColor: settings.surfaceColor, address: settings.address,
  facebookUrl: settings.facebookUrl, phone: settings.phone, opensAt: settings.opensAt, closesAt: settings.closesAt,
  version: settings.version });

export async function updateShopSettings(input: ShopSettingsInput, adminId: string): Promise<{ kind: "success"; settings: ShopSettings } | { kind: "conflict" }> {
  try {
    return await prisma.$transaction(async tx => {
    const before = await tx.shopSettings.findUniqueOrThrow({ where: { id: 1 } });
    if (before.version !== input.expectedVersion) return { kind: "conflict" as const };
    const { expectedVersion: _expectedVersion, ...data } = input;
    void _expectedVersion;
    const change = await tx.shopSettings.updateMany({ where: { id: 1, version: input.expectedVersion }, data: { ...data, version: { increment: 1 }, updatedById: adminId } });
    if (change.count !== 1) return { kind: "conflict" as const };
    const after = await tx.shopSettings.findUniqueOrThrow({ where: { id: 1 } });
    await tx.adminConfigEvent.create({ data: { adminId, action: "update", entityType: "shop_settings", entityId: "1", before: auditSnapshot(before), after: auditSnapshot(after) } });
    return { kind: "success" as const, settings: after };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    // PostgreSQL can abort either competing SERIALIZABLE transaction; both are safe conflicts.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return { kind: "conflict" };
    throw error;
  }
}
