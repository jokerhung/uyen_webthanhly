import "server-only";
import { cache } from "react";
import { ItemStatus, IntakeType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/client";

export const catalogWhere = { status: ItemStatus.APPROVED, consignment: { intakeType: IntakeType.CONSIGN } } satisfies Prisma.ItemWhereInput;
export const CATALOG_PAGE_SIZE = 12;

/** Explicit projections: no consignor, public code, storage keys or customer contact. */
export const catalogCardSelect = {
  id: true, slug: true, name: true, salePrice: true, publishedAt: true,
  brand: { select: { label: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 1, select: { id: true, altText: true } },
} satisfies Prisma.ItemSelect;

export const getCatalogItem = cache(async (slug: string) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) return null;
  return prisma.item.findFirst({
    where: { ...catalogWhere, slug },
    select: { slug: true, name: true, description: true, condition: true, salePrice: true, categoryRecord: { select: { name: true } }, images: { orderBy: { sortOrder: "asc" }, select: { id: true, altText: true } } },
  });
});

export function catalogImageUrl(slug: string, imageId: string) {
  return `/api/items/${encodeURIComponent(slug)}/images/${encodeURIComponent(imageId)}`;
}
