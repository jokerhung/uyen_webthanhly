import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/content/site";
import { brand } from "@/content/brand";
import { catalogImageUrl, getCatalogItem } from "@/lib/catalog/queries";
import { indexingAllowed } from "@/lib/catalog/indexing";
import "@/components/catalog/catalog.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
const money = (price: { toString(): string } | null) => price ? `${new Intl.NumberFormat("vi-VN").format(Number(price.toString()))} ₫` : "Liên hệ shop";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getCatalogItem((await params).slug);
  if (!item) return { title: "Không tìm thấy mặt hàng", robots: { index: false, follow: false } };
  return { title: item.name, description: `${item.name} · ${item.categoryRecord.name} · ${item.condition}. Giá bán ${money(item.salePrice)}.`, robots: { index: indexingAllowed(), follow: indexingAllowed() } };
}

export default async function CatalogDetail({ params }: Props) {
  const item = await getCatalogItem((await params).slug);
  if (!item) notFound();
  const phone = getSiteConfig().shopPhone;
  const contactPhone = phone && /^\+?[\d\s().-]{8,25}$/.test(phone) ? phone.replace(/[^\d+]/g, "") : null;
  return <div className="catalog container-site"><div className="catalog__detail" style={{ marginTop: "2rem" }}>
    <div className="catalog__gallery">{item.images.length ? item.images.map(image => <div className="catalog__media" key={image.id}><Image unoptimized src={catalogImageUrl(item.slug, image.id)} alt={image.altText} width={800} height={1000} /></div>) : <div className="catalog__media">Chưa có ảnh</div>}</div>
    <div><h1>{item.name}</h1><dl><dt>Giá bán</dt><dd className="catalog__price">{money(item.salePrice)}</dd><dt>Danh mục</dt><dd>{item.categoryRecord.name}</dd><dt>Tình trạng</dt><dd>{item.condition}</dd></dl><h2 className="catalog__name">Mô tả</h2><p className="catalog__description">{item.description}</p>
      <div className="catalog__contacts">
        <a className="catalog__contact" href={brand.facebook} target="_blank" rel="noopener noreferrer">Liên hệ qua Facebook</a>
        <a className="catalog__contact catalog__contact--outline" href={`https://zalo.me/${(contactPhone ?? brand.phone).replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer">Liên hệ qua Zalo</a>
      </div>
    </div>
  </div></div>;
}
