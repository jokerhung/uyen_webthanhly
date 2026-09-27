import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { ManagedListingKind } from "./listing-option-validation";

const relation = { brand: "brandId", size: "sizeId", material: "materialId" } as const;
const projection = { id: true, label: true, sortOrder: true, active: true } as const;
function serialize(row: { id: string; label: string; sortOrder: number; active: boolean }, itemCount: number) {
  return { slug: row.id, name: row.label, sortOrder: row.sortOrder, active: row.active, itemCount };
}
export async function listManagedOptions(kind: ManagedListingKind) {
  const [rows, counts] = await Promise.all([
    prisma.listingOption.findMany({ where: { kind }, select: projection, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.item.groupBy({ by: [relation[kind]], where: { [relation[kind]]: { not: null } }, _count: { _all: true } }),
  ]);
  const byId = new Map(counts.map(row => [row[relation[kind]], row._count._all]));
  return rows.map(row => serialize(row, byId.get(row.id) ?? 0));
}
function makeId(kind: ManagedListingKind) { return `${kind}-${randomBytes(12).toString("hex")}`; }
export async function createManagedOption(kind: ManagedListingKind, input: { name: string; normalizedName: string }, adminId: string) {
  try {
    return await prisma.$transaction(async tx => {
      const existing = await tx.listingOption.findUnique({ where: { kind_normalizedLabel: { kind, normalizedLabel: input.normalizedName } }, select: { id: true, label: true, active: true } });
      if (existing) return { kind: "duplicate" as const, existing: { slug: existing.id, name: existing.label, active: existing.active } };
      // Advisory lock serializes appends for this kind, keeping sortOrder unique under concurrent creates.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`listing-options:${kind}`})::bigint)`;
      const highest = await tx.listingOption.aggregate({ where: { kind }, _max: { sortOrder: true } });
      const row = await tx.listingOption.create({ data: { id: makeId(kind), kind, label: input.name, normalizedLabel: input.normalizedName, amount: null, sortOrder: (highest._max.sortOrder ?? -1) + 1 }, select: projection });
      await tx.adminConfigEvent.create({ data: { adminId, action: "create", entityType: "listing_option", entityId: row.id, after: { kind, name: row.label, active: true } } });
      return { kind: "success" as const, category: serialize(row, 0) };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.listingOption.findUnique({ where: { kind_normalizedLabel: { kind, normalizedLabel: input.normalizedName } }, select: { id: true, label: true, active: true } });
      if (existing) return { kind: "duplicate" as const, existing: { slug: existing.id, name: existing.label, active: existing.active } };
    }
    throw error;
  }
}
export async function setManagedOptionActive(kind: ManagedListingKind, id: string, expectedActive: boolean, active: boolean, adminId: string) {
  return prisma.$transaction(async tx => {
    const current = await tx.listingOption.findFirst({ where: { kind, id }, select: projection });
    if (!current) return { kind: "missing" as const };
    if (current.active !== expectedActive) return { kind: "conflict" as const };
    const changed = await tx.listingOption.updateMany({ where: { id, kind, active: expectedActive }, data: { active } });
    if (changed.count !== 1) return { kind: "conflict" as const };
    await tx.adminConfigEvent.create({ data: { adminId, action: active ? "restore" : "deactivate", entityType: "listing_option", entityId: id, before: { kind, name: current.label, active: expectedActive }, after: { kind, name: current.label, active } } });
    const itemCount = await tx.item.count({ where: { [relation[kind]]: id } });
    return { kind: "success" as const, category: serialize({ ...current, active }, itemCount) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
