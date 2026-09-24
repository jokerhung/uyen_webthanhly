import type { Metadata } from "next";
import { aboutParagraphs, timeline } from "@/content/about";
import { branchGroups, openingHours } from "@/content/branches";
import { getSiteConfig } from "@/content/site";
import { CopyHotline } from "@/components/shared/copy-hotline";
import styles from "@/components/shared/about.module.css";

export const metadata: Metadata = { title: "Giới thiệu H.U.N" };

export default function AboutPage() {
  const { shopPhone } = getSiteConfig();

  return <section className={styles.section} id="intro">
    <div className={styles.container}>
      <div className={styles.grid}>
        <div>
          <h1 className={styles.heading}>Chào bạn, chúng mình là H.U.N</h1>
          <div className={styles.body}>{aboutParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </div>
        <div className={styles.timeline} aria-label="Các cột mốc của H.U.N">
          {timeline.map(({ year, label, current }) => <div key={year} className={`${styles.timelineItem} ${current ? styles.current : ""}`}>
            <span className={styles.year}>{year}</span><span className={styles.label}>{label}</span>
          </div>)}
        </div>
      </div>
      <div className={styles.branches}>
        <h2 className={styles.tag}>3 cơ sở tại Hà Nội</h2>
        <p className={styles.note}><strong>Lưu ý:</strong>— H.U.N hiện chỉ bán tại cửa hàng<br />— Thời gian: {openingHours} hàng ngày</p>
        <div className={styles.branchGrid}>
          {branchGroups.map((group) => <div className={styles.branchGroup} key={group.name}>
            <h3 className={styles.branchName}>{group.name}</h3>
            <p className={styles.branchDesc}>{group.description}</p>
            <div className={styles.branchList}>
              {group.branches.map((branch) => <div className={styles.branchItem} key={branch.id}>
                <p className={styles.address}>📍 {branch.address}</p>
                <CopyHotline phone={shopPhone} />
                <span className={styles.directions} title="Chưa xác minh địa chỉ liên kết">Tìm đường · liên kết chưa xác minh</span>
              </div>)}
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}
