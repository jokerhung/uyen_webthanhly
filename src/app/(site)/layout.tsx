import Link from "next/link";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-screen flex-col">
    <header className="border-b border-border py-4"><div className="container-site flex items-center justify-between gap-4"><Link href="/" className="text-xl font-semibold tracking-widest">H.U.N</Link><span className="text-xs uppercase tracking-widest">Website đang xây dựng</span></div></header>
    <main className="flex-1">{children}</main>
    <footer className="bg-neutral-950 py-8 text-center text-sm text-white">H.U.N · Nền tảng ký gửi</footer>
  </div>;
}
