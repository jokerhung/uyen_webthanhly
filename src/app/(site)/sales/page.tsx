import type { Metadata } from "next";
import { LookupForm } from "@/components/settlement/lookup-form";

export const metadata: Metadata = { title: "Tra cứu quyết toán", description: "Tra cứu tình trạng phiếu tiếp nhận bằng mã đơn hàng hoặc số điện thoại.", robots: { index: false, follow: false } };
export default function SalesPage() {
  return <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-[1200px] flex-col items-center px-[5%] pb-16 pt-24 text-center md:pt-20">
    <h1 className="text-[36px] leading-[1.65] font-medium tracking-[.04em] text-black md:text-[63px]">TRA CỨU QUYẾT TOÁN</h1>
    <span className="mt-1 block h-px w-10 bg-black" aria-hidden="true" />
    <p className="mb-10 mt-4 text-[15px] text-neutral-600">Nhập mã đơn hàng hoặc số điện thoại đã đăng ký để xem báo cáo chi tiết.</p>
    <LookupForm />
  </section>;
}
