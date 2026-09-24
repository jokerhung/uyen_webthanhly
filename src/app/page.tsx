import Link from "next/link";

const routes = [
  ["Giới thiệu", "/about"],
  ["Ký gửi", "/consign"],
  ["Thu mua", "/buy"],
  ["Quyết toán", "/sales"],
] as const;

export default function Home() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-black px-6 text-center text-white">
    <p className="text-xs tracking-[.4em] uppercase">Bản khung — giao diện chờ đối chiếu baseline</p>
    <h1 className="text-6xl font-medium tracking-[.2em] sm:text-8xl">H.U.N</h1>
    <nav aria-label="Điều hướng chính" className="flex flex-wrap justify-center gap-6 text-sm uppercase tracking-widest">
      {routes.map(([label, href]) => <Link key={href} href={href} className="hover:underline">{label}</Link>)}
    </nav>
    <Link href="/items" className="text-xs underline underline-offset-4">Hàng đang bán (sắp ra mắt)</Link>
  </main>;
}
