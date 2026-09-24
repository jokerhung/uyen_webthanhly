import Link from "next/link";
import { announcement } from "@/content/about";
import { openingHours } from "@/content/branches";
import styles from "./site-chrome.module.css";

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
    <div className={styles.brand}>H.U.N</div>
    <p className={styles.tagline}>&quot;Go green before green goes.&quot;</p>
    <div className={styles.divider} aria-hidden="true" />
    <p className={styles.hours}>Khung giờ làm việc: {openingHours}</p>
    <p className={styles.copy}>© 2026 H.U.N Thanh Lý Ký Gửi · Hà Nội</p>
  </footer>;
}
