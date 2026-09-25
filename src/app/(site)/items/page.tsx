import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/catalog-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hàng đang bán", description: "Khám phá các mặt hàng ký gửi đã được H.U.N duyệt và đang bán." };
export default CatalogPage;
