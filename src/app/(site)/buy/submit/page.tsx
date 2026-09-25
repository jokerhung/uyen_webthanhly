import type { Metadata } from "next";
import { ConsignmentForm } from "@/components/consignments/consignment-form";
import { getSiteConfig } from "@/content/site";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = { title: "Gửi yêu cầu thu mua | H.U.N", description: "Gửi thông tin mặt hàng để shop xem xét báo giá thu mua; chưa phải thỏa thuận bán." };
export const dynamic = "force-dynamic";

export default async function BuySubmitPage() {
  const { minimumConsignmentItems, maxImagesPerItem, maxImageBytes, privacyPolicyReviewed } = getSiteConfig();
  const categories = await prisma.itemCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { slug: true, name: true } });
  return <section className="consignment-page container-site" aria-labelledby="buy-submit-heading">
    <div className="consignment-page__intro">
      <h1 id="buy-submit-heading">Gửi yêu cầu thu mua</h1>
      <p>Điền thông tin liên hệ và mặt hàng để shop xem xét, báo giá. Gửi yêu cầu không có nghĩa shop đã đồng ý thu mua hoặc thanh toán. Vui lòng không gửi đồ giá trị cao qua đường vận chuyển khi chưa được shop xác nhận.</p>
    </div>
    <ConsignmentForm intakeType="buy" minimumItems={minimumConsignmentItems} maxImagesPerItem={maxImagesPerItem} maxImageBytes={maxImageBytes} privacyPolicyReviewed={privacyPolicyReviewed} categories={categories} />
  </section>;
}
