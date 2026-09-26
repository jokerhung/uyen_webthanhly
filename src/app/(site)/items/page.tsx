import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/catalog-page";
import { getPublicShop } from "@/lib/shop/public";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const shop = await getPublicShop(); return { title: "Hàng đang bán", description: `Khám phá các mặt hàng ký gửi đã được ${shop.shopName} duyệt và đang bán.` }; }
export default CatalogPage;
