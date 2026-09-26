import type { Metadata } from "next";
import { getPublicShop } from "@/lib/shop/public";
export async function generateMetadata(): Promise<Metadata> { const shop = await getPublicShop(); return { robots: { index: false, follow: false }, title: { default: `Quản trị ${shop.shopName}`, template: `%s | Quản trị ${shop.shopName}` } }; }
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <div className="min-h-screen bg-neutral-50 text-neutral-950">{children}</div>; }
