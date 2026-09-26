import Link from "next/link";
import { AnnouncementTicker, SiteFooter } from "@/components/shared/site-chrome";
import styles from "@/components/shared/home.module.css";
import CatalogPage from "@/components/catalog/catalog-page";
import { getPublicShop } from "@/lib/shop/public";

export const dynamic = "force-dynamic";

const routes = [
  ["Giới Thiệu", "/about"],
  ["Ký Gửi", "/consign"],
  ["Thu Mua", "/buy"],
  ["Xem quyết toán", "/sales"],
] as const;

export default async function Home() {
  const shop = await getPublicShop();
  return <div className={styles.page}>
    <AnnouncementTicker />
    <main className={styles.content}>
      <div className={styles.menu}>
        <h1 className={styles.title}>{shop.shopName}</h1>
        <p className={styles.brandSubtitle}>{shop.slogan}</p>
        <nav aria-label="Điều hướng chính">
          <ul className={styles.nav}>
            {routes.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
          </ul>
        </nav>
        <a href="#hang-dang-ban" className={styles.scrollHint}>Cuộn tiếp để xem hàng đang bán<span aria-hidden="true">↓</span></a>
      </div>
      <section id="hang-dang-ban" className={styles.catalogSection} aria-label="Hàng đang bán">
        <CatalogPage searchParams={Promise.resolve({})} />
      </section>
    </main>
    <SiteFooter />
  </div>;
}
