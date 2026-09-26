import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { AnnouncementInput } from "./announcement-validation";
import { getShopSettings, type ShopSettings } from "./settings";

export const getAnnouncementSettings = getShopSettings;

/** Update only ticker fields; compare the shared shop version so concurrent profile edits are visible. */
export async function updateAnnouncementSettings(input: AnnouncementInput, adminId: string): Promise<{ kind: "success"; settings: ShopSettings } | { kind: "conflict" }> {
  try {
    return await prisma.$transaction(async tx => {
      const before = await tx.shopSettings.findUniqueOrThrow({ where: { id: 1 } });
      if (before.version !== input.expectedVersion) return { kind: "conflict" as const };
      const change = await tx.shopSettings.updateMany({
        where: { id: 1, version: input.expectedVersion },
        data: { announcementText: input.announcementText, announcementEnabled: input.announcementEnabled, version: { increment: 1 }, updatedById: adminId },
      });
      if (change.count !== 1) return { kind: "conflict" as const };
      const after = await tx.shopSettings.findUniqueOrThrow({ where: { id: 1 } });
      await tx.adminConfigEvent.create({ data: {
        adminId, action: "update", entityType: "shop_announcement", entityId: "1",
        before: { announcementText: before.announcementText, announcementEnabled: before.announcementEnabled, version: before.version },
        after: { announcementText: after.announcementText, announcementEnabled: after.announcementEnabled, version: after.version },
      } });
      return { kind: "success" as const, settings: after };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return { kind: "conflict" };
    throw error;
  }
}
