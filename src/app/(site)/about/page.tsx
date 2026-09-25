import type { Metadata } from "next";
import { aboutParagraphs } from "@/content/about";
import { branchGroups, openingHours } from "@/content/branches";
import { getSiteConfig } from "@/content/site";
import { CopyHotline } from "@/components/shared/copy-hotline";
import styles from "@/components/shared/about.module.css";
import { brand } from "@/content/brand";

export const metadata: Metadata = { title: "Giới thiệu Besties Club" };

export default function AboutPage() {
  const { shopPhone } = getSiteConfig();

  return <section className={styles.section} id="intro">
    <div className={styles.container}>
      <div className={styles.grid}>
        <div>
          <h1 className={styles.heading}>Chào bạn, chúng mình là Besties Club</h1>
          <div className={styles.body}>{aboutParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        </div>
        <aside className={styles.brandPanel}><p>BESTIES</p><em>Club</em><span>{brand.tagline}</span><a href={brand.facebook} target="_blank" rel="noreferrer">Gặp Besties trên Facebook ↗</a></aside>
      </div>
      <div className={styles.branches}>
        <h2 className={styles.tag}>Ghé Besties Club tại Hà Nội</h2>
        <p className={styles.note}>Giờ mở cửa: {openingHours}<br /><a href={`mailto:${brand.email}`}>{brand.email}</a></p>
        <div className={styles.branchGrid}>
          {branchGroups.map((group) => <div className={styles.branchGroup} key={group.name}>
            <h3 className={styles.branchName}>{group.name}</h3>
            <p className={styles.branchDesc}>{group.description}</p>
            <div className={styles.branchList}>
              {group.branches.map((branch) => <div className={styles.branchItem} key={branch.id}>
                <p className={styles.address}>📍 {branch.address}</p>
                <CopyHotline phone={shopPhone} />
                <a className={styles.directions} href={brand.facebook} target="_blank" rel="noreferrer">Liên hệ qua Facebook</a>
              </div>)}
            </div>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}
