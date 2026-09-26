import type { Metadata } from "next";
import { consignCriteria, consignFeeExample, consignFees, getConsignProcesses } from "@/content/consign";
import { CriteriaList } from "@/components/services/criteria-list";
import { FeeTable } from "@/components/services/fee-table";
import { ServiceModeTabs } from "@/components/services/service-mode-tabs";
import "@/components/services/services.css";
import { getPublicShop } from "@/lib/shop/public";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const shop = await getPublicShop(); return { title: "Ký gửi", description: `Thông tin phí, tiêu chí và quy trình ký gửi tại ${shop.shopName}.` }; }

export default async function ConsignPage() {
  const shop = await getPublicShop();
  const processes = getConsignProcesses(shop);
  const branches = [{ name: shop.shopName, description: "Thanh lý & ký gửi", branches: [{ address: shop.address, phone: shop.phone }] }];
  return <section className="service-page consign" aria-labelledby="consign-heading"><div className="service-page__container">
    <h1 className="section-heading" id="consign-heading">Ký Gửi</h1>
    <p className="section-sub">Gửi món đồ cũ, mở ra một hành trình mới</p>
    <div className="consign__grid">
      <section className="info-block" aria-labelledby="consign-fees-heading"><h2 className="info-block__label" id="consign-fees-heading">Phí Ký Gửi</h2><FeeTable fees={consignFees} example={consignFeeExample} /></section>
      <section className="info-block" aria-labelledby="consign-criteria-heading"><h2 className="info-block__label" id="consign-criteria-heading">Tiêu Chí Nhận Ký Gửi</h2><CriteriaList items={consignCriteria} /></section>
    </div>
    <ServiceModeTabs kind="consign" heading="Bạn muốn ký gửi theo hình thức nào?" processes={processes} branches={branches} />
  </div></section>;
}
