import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

const projection = { slug: true, name: true, sortOrder: true, active: true, _count: { select: { items: true } } } as const;
export async function listCategories() {
  const rows = await prisma.itemCategory.findMany({ select: projection, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return rows.map(({ _count, ...row }) => ({ ...row, itemCount: _count.items }));
}
function newSlug(name: string) {
  const base = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 78).replace(/-+$/, "") || "loai";
  return `${base}-${randomBytes(6).toString("hex")}`;
}
export async function createCategory(input: { name: string; normalizedName: string }, adminId: string) {
  try {
    const result = await prisma.$transaction(async tx => {
      const existing = await tx.itemCategory.findUnique({ where: { normalizedName: input.normalizedName }, select: { slug: true, name: true, active: true } });
      if (existing) return { kind: "duplicate" as const, existing };
      const category = await tx.itemCategory.create({ data: { name: input.name, normalizedName: input.normalizedName, slug: newSlug(input.name), sortOrder: 999 }, select: projection });
      await tx.adminConfigEvent.create({ data: { adminId, action: "create", entityType: "item_category", entityId: category.slug, after: { name: category.name, active: true } } });
      const { _count, ...row } = category;
      return { kind: "success" as const, category: { ...row, itemCount: _count.items } };
    });
    return result;
  } catch (error) {
    // Unique constraints, including inactive names, are the final arbiter for concurrent creates.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.itemCategory.findUnique({ where: { normalizedName: input.normalizedName }, select: { slug: true, name: true, active: true } });
      return { kind: "duplicate" as const, existing };
    }
    throw error;
  }
}
export async function setCategoryActive(slug: string, expectedActive: boolean, active: boolean, adminId: string) {
  return prisma.$transaction(async tx => {
    const current = await tx.itemCategory.findUnique({ where: { slug }, select: { slug: true, name: true, active: true } });
    if (!current) return { kind: "missing" as const };
    if (current.active !== expectedActive) return { kind: "conflict" as const };
    const changed = await tx.itemCategory.updateMany({ where: { slug, active: expectedActive }, data: { active } });
    if (changed.count !== 1) return { kind: "conflict" as const };
    await tx.adminConfigEvent.create({ data: { adminId, action: active ? "restore" : "deactivate", entityType: "item_category", entityId: slug, before: { name: current.name, active: expectedActive }, after: { name: current.name, active } } });
    const itemCount = await tx.item.count({ where: { category: slug } });
    return { kind: "success" as const, category: { ...current, active, itemCount } };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
