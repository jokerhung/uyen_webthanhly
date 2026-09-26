import type { Metadata } from "next";
import { buyAnnouncement, buyCriteria, buyPrices, getBuyProcesses } from "@/content/buy";
import { CriteriaList } from "@/components/services/criteria-list";
import { ServiceModeTabs } from "@/components/services/service-mode-tabs";
import "@/components/services/services.css";
import { getPublicShop } from "@/lib/shop/public";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const shop = await getPublicShop(); return { title: "Thu mua", description: `Thông tin chương trình và quy trình thu mua tại ${shop.shopName}.` }; }

export default async function BuyPage() {
  const shop = await getPublicShop();
  const processes = getBuyProcesses(shop);
  return <section className="service-page buy" aria-labelledby="buy-heading"><div className="service-page__container">
    <h1 className="section-heading" id="buy-heading">Thu Mua</h1>
    <p className="section-sub">{buyAnnouncement.join(" ")}</p>
    <div className="buy__cards" aria-label="Nhóm giá thu mua">{buyPrices.map(price => <div className="buy-card" key={price.name}><h2 className="buy-card__name">{price.name}</h2><p className="buy-card__price">{price.price}</p></div>)}</div>
    <section className="buy__criteria" aria-labelledby="buy-criteria-heading"><h2 className="info-block__label" id="buy-criteria-heading">Tiêu Chí Nhận Thu Mua</h2><div className="buy__criteria-cols">{buyCriteria.map(group => <div key={group.title}><h3 className="criteria-group-title">{group.title}</h3><CriteriaList items={group.items} /></div>)}</div></section>
    <div className="buy__methods"><ServiceModeTabs kind="buy" heading="Bạn muốn thu mua theo hình thức nào?" processes={processes} /></div>
  </div></section>;
}
