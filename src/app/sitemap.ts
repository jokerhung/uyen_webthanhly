import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/client";
import { catalogWhere } from "@/lib/catalog/queries";
import { indexingAllowed, publicSiteOrigin } from "@/lib/catalog/indexing";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingAllowed()) return [];
  const origin = publicSiteOrigin()!;
  const items = await prisma.item.findMany({ where: catalogWhere, select: { slug: true, updatedAt: true }, orderBy: { id: "asc" }, take: 10000 });
  return ["", "/about", "/consign", "/buy", "/items"].map(path => ({ url: `${origin}${path}` })).concat(items.map(item => ({ url: `${origin}/items/${encodeURIComponent(item.slug)}`, lastModified: item.updatedAt })));
}
