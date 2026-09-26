import type { Metadata } from "next";
import { brand } from "@/content/brand";
import { getPublicShop, shopDescription, shopOpeningHours } from "@/lib/shop/public";
import { CopyHotline } from "@/components/shared/copy-hotline";
import styles from "@/components/shared/about.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const shop = await getPublicShop(); return { title: `Giới thiệu ${shop.shopName}` }; }

export default async function AboutPage() {
  const shop = await getPublicShop();
  return <section className={styles.section} id="intro">
    <div className={styles.container}>
      <div className={styles.grid}>
        <div><h1 className={styles.heading}>Chào bạn, chúng mình là {shop.shopName}</h1><div className={styles.body}><p>{shopDescription(shop)}</p></div></div>
        <aside className={styles.brandPanel}><p>{shop.shopName}</p><em>Club</em><span>{shop.slogan}</span><a href={shop.facebookUrl} target="_blank" rel="noopener noreferrer">Gặp {shop.shopName} trên Facebook ↗</a></aside>
      </div>
      <div className={styles.branches}>
        <h2 className={styles.tag}>Ghé {shop.shopName} tại Hà Nội</h2>
        <p className={styles.note}>Giờ mở cửa: {shopOpeningHours(shop)}<br /><a href={`mailto:${brand.email}`}>{brand.email}</a></p>
        <div className={styles.branchGrid}><div className={styles.branchGroup}>
          <h3 className={styles.branchName}>{shop.shopName}</h3><p className={styles.branchDesc}>Thanh lý • Ký gửi • Thời trang được yêu thêm lần nữa</p>
          <div className={styles.branchList}><div className={styles.branchItem}>
            <p className={styles.address}>📍 {shop.address}</p><CopyHotline phone={shop.phone} />
            <a className={styles.directions} href={shop.facebookUrl} target="_blank" rel="noopener noreferrer">Liên hệ qua Facebook</a>
          </div></div>
        </div></div>
      </div>
    </div>
  </section>;
}
