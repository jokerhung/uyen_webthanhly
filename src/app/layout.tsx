import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin", "vietnamese"], variable: "--font-montserrat", display: "swap" });

export const metadata: Metadata = {
  title: { default: "H.U.N — Trang đang xây dựng", template: "%s | H.U.N" },
  description: "Nền tảng giới thiệu dịch vụ ký gửi, thu mua và quản lý mặt hàng của H.U.N.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={montserrat.variable}><body>{children}</body></html>;
}
