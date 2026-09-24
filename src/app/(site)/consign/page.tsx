import type { Metadata } from "next";
import { consignCriteria, consignFeeExample, consignFees, consignProcesses } from "@/content/consign";
import { CriteriaList } from "@/components/services/criteria-list";
import { FeeTable } from "@/components/services/fee-table";
import { ServiceModeTabs } from "@/components/services/service-mode-tabs";
import "@/components/services/services.css";

export const metadata: Metadata = { title: "Ký gửi | H.U.N", description: "Thông tin phí, tiêu chí và quy trình ký gửi trực tiếp hoặc online tại H.U.N." };

export default function ConsignPage() {
  return <section className="service-page consign" aria-labelledby="consign-heading"><div className="service-page__container">
    <h1 className="section-heading" id="consign-heading">Ký Gửi</h1>
    <p className="section-sub">Nhận tiền sau <strong>50 – 60 ngày</strong></p>
    <div className="consign__grid">
      <section className="info-block" aria-labelledby="consign-fees-heading"><h2 className="info-block__label" id="consign-fees-heading">Phí Ký Gửi</h2><FeeTable fees={consignFees} example={consignFeeExample} /></section>
      <section className="info-block" aria-labelledby="consign-criteria-heading"><h2 className="info-block__label" id="consign-criteria-heading">Tiêu Chí Nhận Ký Gửi</h2><CriteriaList items={consignCriteria} /></section>
    </div>
    <ServiceModeTabs kind="consign" heading="Bạn muốn ký gửi theo hình thức nào?" processes={consignProcesses} />
  </div></section>;
}
