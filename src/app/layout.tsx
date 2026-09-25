import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { indexingAllowed } from "@/lib/catalog/indexing";

const montserrat = Montserrat({ subsets: ["latin", "vietnamese"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Besties Club — Ký gửi & thu mua", template: "%s | Besties Club" },
  description: "Nền tảng giới thiệu dịch vụ ký gửi, thu mua và quản lý mặt hàng của Besties Club.",
  robots: { index: indexingAllowed(), follow: indexingAllowed() },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={montserrat.variable}><body>{children}</body></html>;
}
