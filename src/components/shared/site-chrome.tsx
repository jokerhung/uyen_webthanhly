import Link from "next/link";
import { getPublicShop, shopAnnouncement, shopOpeningHours } from "@/lib/shop/public";
import styles from "./site-chrome.module.css";

export async function AnnouncementTicker() {
  const announcement = shopAnnouncement(await getPublicShop());
  return <div className={styles.ticker} aria-label={announcement}>
    <div className={styles.track} aria-hidden="true">
      {[0, 1].map((index) => <div className={styles.item} key={index}><span className={styles.separator}>✦</span><span>{announcement}</span></div>)}
    </div>
  </div>;
}

export function BackToHome() {
  return <Link href="/" className={styles.back}>← Trang chủ</Link>;
}

export async function SiteFooter() {
  const shop = await getPublicShop();
  return <footer className={styles.footer}>
    <div className={styles.brand}>{shop.shopName}</div>
    <p className={styles.tagline}>{shop.slogan}</p>
    <div className={styles.divider} aria-hidden="true" />
    <p className={styles.hours}><a href={shop.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook {shop.shopName}</a> · {shop.address} · Giờ mở cửa: {shopOpeningHours(shop)}</p>
    <p className={styles.copy}>© {new Date().getFullYear()} {shop.shopName} · Hà Nội</p>
  </footer>;
}
