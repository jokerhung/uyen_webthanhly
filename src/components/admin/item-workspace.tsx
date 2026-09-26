import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { date, money } from "./admin-ui";
import { ItemGallery } from "./item-gallery";
import { ItemActions } from "./item-actions";
import { itemStatusLabels } from "@/lib/admin/item-status";
import "./item-workspace.css";
import { prisma } from "@/lib/db/client";
import type { ListingOptions } from "@/types/listing-options";
import { getSiteConfig } from "@/content/site";

export const itemWorkspaceInclude = {
  categoryRecord: true, gender: true, season: true, material: true, size: true, brand: true,
  consignment: { include: { consignor: true } },
  images: { orderBy: { sortOrder: "asc" as const } },
  statusEvents: { orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }], include: { actorAdmin: { select: { email: true } } } },
  reviewedBy: { select: { email: true } },
} satisfies Prisma.ItemInclude;

type WorkspaceItem = Prisma.ItemGetPayload<{ include: typeof itemWorkspaceInclude }>;

export async function ItemWorkspace({ item }: { item: WorkspaceItem }) {
  const imageConfig = getSiteConfig();
  const [choices, categories] = await Promise.all([
    prisma.listingOption.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, label: true, kind: true } }),
    prisma.itemCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true } }),
  ]);
  const byKind = (kind: string) => choices.filter(choice => choice.kind === kind).map(({ id, label }) => ({ id, label }));
  const listingOptions: ListingOptions = { genderId: byKind("gender"), seasonId: byKind("season"), category: categories.map(category => ({ id: category.slug, label: category.name })), materialId: byKind("material"), sizeId: byKind("size"), brandId: byKind("brand"), priceOptionId: byKind("price") };
  const inactiveCategory = !categories.some(category => category.slug === item.category) ? { id: item.category, label: `${item.categoryRecord.name} (Đã ngừng dùng)` } : undefined;
  return <div className="item-workspace">
    <div><ItemGallery key={`${item.id}-${item.updatedAt.toISOString()}`} itemId={item.id} updatedAt={item.updatedAt.toISOString()} images={item.images} name={item.name} maxImages={Math.min(imageConfig.maxImagesPerItem ?? 5, 30)} maxBytes={Math.min(imageConfig.maxImageBytes ?? 5 * 1024 * 1024, 10 * 1024 * 1024)} /></div>
    <div className="item-workspace__information">
      <header>
        <h2 className="item-workspace__name">{item.name}</h2>
        <p className="item-workspace__code">Mã phiếu: <Link href={`/admin/consignments/${item.consignment.id}`}>{item.consignment.publicCode}</Link></p>
        <div className="item-workspace__price"><strong>{money(item.salePrice ?? item.desiredPrice)}</strong><span>{item.salePrice == null ? "Giá mong muốn" : "Giá bán"}</span></div>
      </header>
      <div className="item-workspace__actions"><ItemActions key={`${item.id}-${item.updatedAt.toISOString()}`} initialSalePrice={(item.salePrice ?? item.desiredPrice)?.toString() ?? ""} id={item.id} status={item.status} intakeType={item.consignment.intakeType} listingOptions={listingOptions} inactiveCategory={inactiveCategory} initialListing={{ genderId: item.genderId ?? "", seasonId: item.seasonId ?? "", category: item.category, materialId: item.materialId ?? "", sizeId: item.sizeId ?? "", brandId: item.brandId ?? "", priceOptionId: item.priceOptionId ?? "" }} /></div>
        <ItemActions key={`${item.id}-${item.updatedAt.toISOString()}`} id={item.id} status={item.status} intakeType={item.consignment.intakeType} listingOptions={listingOptions} inactiveCategory={inactiveCategory} initialListing={{ genderId: item.genderId ?? "", seasonId: item.seasonId ?? "", category: item.category, materialId: item.materialId ?? "", sizeId: item.sizeId ?? "", brandId: item.brandId ?? "", priceOptionId: item.priceOptionId ?? "" }} editor={{ description: item.description, condition: item.condition, salePrice: item.salePrice?.toString() ?? "", updatedAt: item.updatedAt.toISOString() }} >
        <p className="item-workspace__description">{item.description}</p>
        <dl><dt>Giới tính</dt><dd>{item.gender?.label ?? "—"}</dd><dt>Mùa</dt><dd>{item.season?.label ?? "—"}</dd><dt>Danh mục</dt><dd>{item.categoryRecord.name}</dd><dt>Chất liệu</dt><dd>{item.material?.label ?? "—"}</dd><dt>Kích thước</dt><dd>{item.size?.label ?? "—"}</dd><dt>Nhãn hiệu</dt><dd>{item.brand?.label ?? "—"}</dd><dt>Tình trạng</dt><dd>{item.condition}</dd><dt>Giá mong muốn</dt><dd>{money(item.desiredPrice)}</dd><dt>Giá bán</dt><dd>{money(item.salePrice)}</dd></dl>
      </ItemActions>
      <details className="item-workspace__section" open><summary>Thông tin ký gửi</summary><div className="item-workspace__section-body">
        <p className="item-workspace__private">Chỉ hiển thị với quản trị viên</p>
        <dl><dt>Khách gửi</dt><dd>{item.consignment.consignor.name}</dd><dt>Số điện thoại</dt><dd><a href={`tel:${item.consignment.consignor.phoneNormalized}`}>{item.consignment.consignor.phoneNormalized}</a></dd><dt>Người duyệt</dt><dd>{item.reviewedBy?.email ?? "—"}</dd><dt>Ngày duyệt</dt><dd>{item.reviewedAt ? date(item.reviewedAt) : "—"}</dd></dl>
        {item.consignment.note && <p className="item-workspace__description">{item.consignment.note}</p>}
      </div></details>
      <details className="item-workspace__section"><summary>Lịch sử trạng thái ({item.statusEvents.length})</summary><div className="item-workspace__section-body">
        {item.statusEvents.length ? <ol className="item-workspace__history">{item.statusEvents.map(event => <li key={event.id}><strong>{itemStatusLabels[event.fromStatus]} → {itemStatusLabels[event.toStatus]}</strong><p>{date(event.createdAt)} · {event.actorAdmin.email}</p>{event.reason && <p>Lý do: {event.reason}</p>}</li>)}</ol> : <p>Chưa có lịch sử trạng thái.</p>}
      </div></details>
    </div>
  </div>;
}
