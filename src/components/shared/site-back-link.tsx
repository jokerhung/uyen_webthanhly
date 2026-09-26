"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-chrome.module.css";

export function SiteBackLink({ tickerVisible }: { tickerVisible: boolean }) {
  const pathname = usePathname();
  const isItemDetail = /^\/items\/[^/]+\/?$/.test(pathname);
  return <Link href={isItemDetail ? "/items" : "/"} className={`${styles.back} ${tickerVisible ? "" : styles.backWithoutTicker}`}>
    {isItemDetail ? "← Hàng đang bán" : "← Trang chủ"}
  </Link>;
}
