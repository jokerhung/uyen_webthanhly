import type { Metadata } from "next";
import { ConsignmentForm } from "@/components/consignments/consignment-form";
import { getSiteConfig } from "@/content/site";
import { prisma } from "@/lib/db/client";
import { getPublicShop } from "@/lib/shop/public";

export async function generateMetadata(): Promise<Metadata> { const shop = await getPublicShop(); return { title: "Gửi hàng ký gửi", description: `Gửi phiếu ký gửi và hình ảnh mặt hàng để ${shop.shopName} xem xét.`, robots: { index: false, follow: false } }; }

export const dynamic = "force-dynamic";

export default async function ConsignmentSubmitPage() {
  const { minimumConsignmentItems, maxImagesPerItem, maxImageBytes, privacyPolicyReviewed } = getSiteConfig();
  const categories = await prisma.itemCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true } });
  return <section className="consignment-page container-site" aria-labelledby="consignment-heading">
    <div className="consignment-page__intro"><h1 id="consignment-heading">Gửi hàng ký gửi</h1><p>Điền thông tin liên hệ và từng mặt hàng bạn muốn ký gửi. Sau khi gửi thành công, bạn sẽ nhận mã phiếu để lưu lại. Mặt hàng chỉ có thể được đăng bán sau khi quản trị viên duyệt.</p></div>
    <ConsignmentForm intakeType="consign" minimumItems={minimumConsignmentItems} maxImagesPerItem={maxImagesPerItem} maxImageBytes={maxImageBytes} privacyPolicyReviewed={privacyPolicyReviewed} categories={categories} />
  </section>;
}
