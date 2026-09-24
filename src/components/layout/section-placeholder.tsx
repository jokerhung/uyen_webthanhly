import Link from "next/link";

/** Phase 1 placeholder only; reference-page rendering belongs to Phase 2. */
export function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return <section className="container-site flex min-h-[55vh] flex-col justify-center gap-5 py-16">
    <p className="text-xs uppercase tracking-[.3em]">Giai đoạn 1 · nền tảng</p>
    <h1 className="text-4xl font-medium tracking-wider md:text-6xl">{title}</h1>
    <p className="max-w-xl leading-7">{description}</p>
    <p className="text-sm text-neutral-500">Trang khung; chưa phải bản sao giao diện tham chiếu.</p>
    <Link className="w-fit underline underline-offset-4" href="/">Về trang chủ</Link>
  </section>;
}
