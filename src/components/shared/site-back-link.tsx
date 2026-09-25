"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-chrome.module.css";

export function SiteBackLink() {
  const pathname = usePathname();
  const isItemDetail = /^\/items\/[^/]+\/?$/.test(pathname);
  return <Link href={isItemDetail ? "/items" : "/"} className={styles.back}>
    {isItemDetail ? "← Hàng đang bán" : "← Trang chủ"}
  </Link>;
}
