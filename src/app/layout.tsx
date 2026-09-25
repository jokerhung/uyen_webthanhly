import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { indexingAllowed } from "@/lib/catalog/indexing";

const montserrat = Montserrat({ subsets: ["latin", "vietnamese"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "H.U.N — Ký gửi & thu mua", template: "%s | H.U.N" },
  description: "Nền tảng giới thiệu dịch vụ ký gửi, thu mua và quản lý mặt hàng của H.U.N.",
  robots: { index: indexingAllowed(), follow: indexingAllowed() },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={montserrat.variable}><body>{children}</body></html>;
}
