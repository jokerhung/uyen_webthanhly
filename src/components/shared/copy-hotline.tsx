"use client";

import { useState } from "react";
import styles from "./copy-hotline.module.css";

export function CopyHotline({ phone }: { phone: string | null }) {
  const [feedback, setFeedback] = useState("");

  if (!phone) return <span className={styles.unavailable}>📞 Hotline đang cập nhật</span>;

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(phone!);
      setFeedback("Đã sao chép số điện thoại");
    } catch {
      setFeedback("Không thể sao chép. Vui lòng chọn và sao chép số thủ công.");
    }
  }

  return <span className={styles.wrapper}>
    <span>📞 <span className={styles.number}>{phone}</span></span>
    <button type="button" className={styles.button} aria-label={`Sao chép số điện thoại ${phone}`} onClick={copy}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    </button>
    {feedback && <span className={styles.feedback} role="status">{feedback}</span>}
  </span>;
}
