import Link from "next/link";
import { AnnouncementTicker, SiteFooter } from "@/components/shared/site-chrome";
import styles from "@/components/shared/home.module.css";

const routes = [
  ["Giới Thiệu", "/about"],
  ["Ký Gửi", "/consign"],
  ["Thu Mua", "/buy"],
  ["Xem quyết toán", "/sales"],
] as const;

export default function Home() {
  return <div className={styles.page}>
    <AnnouncementTicker />
    <main className={styles.content}>
      <div className={styles.menu}>
        <h1 className={styles.title}>H.U.N</h1>
        <nav aria-label="Điều hướng chính">
          <ul className={styles.nav}>
            {routes.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
          </ul>
        </nav>
      </div>
      <SiteFooter />
    </main>
  </div>;
}
