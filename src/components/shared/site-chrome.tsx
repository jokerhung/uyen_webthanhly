import Link from "next/link";
import { announcement } from "@/content/about";
import { openingHours } from "@/content/branches";
import styles from "./site-chrome.module.css";
import { brand } from "@/content/brand";

export function AnnouncementTicker() {
  return <div className={styles.ticker} aria-label={announcement}>
    <div className={styles.track} aria-hidden="true">
      {[0, 1].map((index) => <div className={styles.item} key={index}><span className={styles.separator}>✦</span><span>{announcement}</span></div>)}
    </div>
  </div>;
}

export function BackToHome() {
  return <Link href="/" className={styles.back}>← Trang chủ</Link>;
}

export function SiteFooter() {
  return <footer className={styles.footer}>
    <div className={styles.brand}>Besties Club</div>
    <p className={styles.tagline}>{brand.tagline}</p>
    <div className={styles.divider} aria-hidden="true" />
    <p className={styles.hours}><a href={brand.facebook} target="_blank" rel="noreferrer">Facebook Besties Club</a> · Giờ mở cửa: {openingHours}</p>
    <p className={styles.copy}>© 2026 Besties Club Thanh Lý Ký Gửi · Hà Nội</p>
  </footer>;
}
