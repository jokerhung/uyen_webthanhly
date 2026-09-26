import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { indexingAllowed } from "@/lib/catalog/indexing";
import { getPublicShop } from "@/lib/shop/public";
import type { CSSProperties } from "react";

const montserrat = Montserrat({ subsets: ["latin", "vietnamese"], variable: "--font-montserrat", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getPublicShop();
  return { title: { default: `${shop.shopName} — Ký gửi & thu mua`, template: `%s | ${shop.shopName}` }, description: `Nền tảng giới thiệu dịch vụ ký gửi, thu mua và quản lý mặt hàng của ${shop.shopName}.`, robots: { index: indexingAllowed(), follow: indexingAllowed() } };
}

function contrastColor(hex: string) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .18 ? "#171717" : "#FFFFFF";
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const shop = await getPublicShop();
  const colors = { "--brand-primary": shop.primaryColor, "--background": shop.backgroundColor, "--surface": shop.surfaceColor, "--foreground": contrastColor(shop.backgroundColor), "--on-brand": contrastColor(shop.primaryColor), "--on-surface": contrastColor(shop.surfaceColor), "--accent": shop.primaryColor, "--border": shop.primaryColor } as CSSProperties;
  return <html lang="vi" className={montserrat.variable} style={colors}><body>{children}</body></html>;
}
