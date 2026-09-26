import type { Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { CATALOG_PAGE_SIZE, catalogCardSelect, catalogImageUrl, catalogWhere } from "@/lib/catalog/queries";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import "@/components/catalog/catalog.css";
import { getPublicShop } from "@/lib/shop/public";

function money(value: { toString(): string } | null) { return value ? `${new Intl.NumberFormat("vi-VN").format(Number(value.toString()))} ₫` : "Liên hệ shop"; }
const filterFields = { gender: "genderId", season: "seasonId", material: "materialId", size: "sizeId", brand: "brandId" } as const;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const shop = await getPublicShop();
  const [options, categories] = await Promise.all([
    prisma.listingOption.findMany({ where: { active: true, kind: { in: Object.keys(filterFields) } }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }], select: { id: true, label: true, kind: true } }),
    prisma.itemCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true } }),
  ]);
  const selected: Record<string, string> = {};
  const where: Prisma.ItemWhereInput = { ...catalogWhere };
  for (const [key, field] of Object.entries(filterFields)) {
    const value = params[key];
    if (typeof value === "string" && options.some(option => option.kind === key && option.id === value)) {
      selected[key] = value;
      where[field as typeof filterFields[keyof typeof filterFields]] = value;
    }
  }
  if (typeof params.category === "string" && categories.some(category => category.slug === params.category)) {
    selected.category = params.category; where.category = params.category;
  }
  for (const key of ["minPrice", "maxPrice"]) {
    const value = params[key];
    if (typeof value === "string" && /^\d{1,14}$/.test(value)) selected[key] = value;
  }
  if (selected.minPrice && selected.maxPrice && Number(selected.minPrice) > Number(selected.maxPrice)) [selected.minPrice, selected.maxPrice] = [selected.maxPrice, selected.minPrice];
  if (selected.minPrice || selected.maxPrice) where.salePrice = { ...(selected.minPrice ? { gte: selected.minPrice } : {}), ...(selected.maxPrice ? { lte: selected.maxPrice } : {}) };
  selected.sort = params.sort === "price-asc" || params.sort === "price-desc" ? params.sort : "new";
  const orderBy: Prisma.ItemOrderByWithRelationInput[] = selected.sort === "new" ? [{ publishedAt: "desc" }, { id: "desc" }] : [{ salePrice: selected.sort === "price-asc" ? "asc" : "desc" }, { id: "desc" }];
  const requested = params.page;
  const pageNumber = typeof requested === "string" && /^[1-9]\d{0,5}$/.test(requested) ? Number(requested) : 1;
  const total = await prisma.item.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(pageNumber, totalPages);
  const items = await prisma.item.findMany({ where, select: catalogCardSelect, orderBy, skip: (page - 1) * CATALOG_PAGE_SIZE, take: CATALOG_PAGE_SIZE });
  const groups = [
    { key: "gender", label: "Giới tính" }, { key: "season", label: "Mùa" }, { key: "category", label: "Danh mục" },
    { key: "brand", label: "Nhãn hiệu" }, { key: "size", label: "Kích thước" }, { key: "material", label: "Chất liệu" },
  ].map(group => ({ ...group, options: group.key === "category" ? categories.map(category => ({ id: category.slug, label: category.name })) : options.filter(option => option.kind === group.key).map(({ id, label }) => ({ id, label })) }));
  const pageUrl = (number: number) => `/items?${new URLSearchParams({ ...selected, page: String(number) })}`;
  return <CatalogFilters groups={groups} selected={selected} total={total}>
    {items.length ? <div className="catalog__grid">{items.map(item => <article className="catalog__card" key={item.id}>
      <Link href={`/items/${encodeURIComponent(item.slug)}`} aria-label={`Xem ${item.name}`} className="catalog__media">{item.images[0] ? <Image unoptimized src={catalogImageUrl(item.slug, item.images[0].id)} alt={item.images[0].altText} width={600} height={900} /> : <span>Chưa có ảnh</span>}</Link>
      <div className="catalog__card-info"><p className="catalog__brand">{item.brand?.label ?? shop.shopName}</p><Link href={`/items/${encodeURIComponent(item.slug)}`} className="catalog__name">{item.name}</Link><p className="catalog__price">{money(item.salePrice)}</p><Link className="catalog__quick-link" href={`/items/${encodeURIComponent(item.slug)}`} aria-label={`Chi tiết ${item.name}`}>+</Link></div>
    </article>)}</div> : <div className="catalog__empty"><p>Không có mặt hàng phù hợp.</p><Link href="/items">Xem tất cả mặt hàng</Link></div>}
    {totalPages > 1 && <nav aria-label="Phân trang hàng đang bán" className="catalog__pagination">{page > 1 ? <Link href={pageUrl(page - 1)}>← Trước</Link> : <span />}<span>Trang {page} / {totalPages}</span>{page < totalPages ? <Link href={pageUrl(page + 1)}>Tiếp →</Link> : <span />}</nav>}
  </CatalogFilters>;
}
