import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false }, title: { default: "Quản trị H.U.N", template: "%s | Quản trị H.U.N" } };
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <div className="min-h-screen bg-neutral-50 text-neutral-950">{children}</div>; }
