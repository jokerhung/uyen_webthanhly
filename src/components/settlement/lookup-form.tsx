"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_PHONE } from "@/mocks/settlements";
import { demoSettlementService } from "@/lib/services/settlement";
import { normalizeVietnamesePhone } from "@/lib/validation/settlement";
import type { LookupResult } from "@/types/settlement";

type ViewState = LookupResult | { kind: "idle" | "invalid" | "loading" };
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function LookupForm() {
  const [phone, setPhone] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.kind === "loading") return;
    const normalized = phone.trim() === DEMO_PHONE ? DEMO_PHONE : normalizeVietnamesePhone(phone);
    if (!normalized) { setView({ kind: "invalid" }); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++generation.current;
    setView({ kind: "loading" });
    try {
      const result = await demoSettlementService.lookup(normalized, controller.signal);
      if (current === generation.current) setView(result);
    } catch {
      if (current === generation.current && !controller.signal.aborted) setView({ kind: "error" });
    }
  }

  function change(value: string) {
    generation.current++;
    request.current?.abort();
    request.current = null;
    setPhone(value);
    setView({ kind: "idle" });
  }

  return <div className="mx-auto w-full max-w-[520px] px-6 text-center">
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="settlement-phone" className="text-sm tracking-wide">Số điện thoại ký gửi</label>
      <input id="settlement-phone" type="tel" autoComplete="off" inputMode="tel" value={phone} onChange={event => change(event.target.value)} placeholder="Nhập số điện thoại" aria-invalid={view.kind === "invalid"} aria-describedby="settlement-hint settlement-feedback" className="w-full border border-neutral-300 px-4 py-3 text-base outline-offset-2 focus-visible:outline-2" />
      <button disabled={view.kind === "loading"} type="submit" className="mx-auto min-w-44 cursor-pointer bg-black px-7 py-3 font-[Arial] text-sm uppercase tracking-[2px] text-white disabled:opacity-50">{view.kind === "loading" ? "ĐANG TÌM..." : "TÌM KIẾM"}</button>
    </form>
    <p id="settlement-hint" className="mt-5 text-xs leading-6 text-neutral-600">BẢN DEMO — không nhập số thật. Chỉ dùng số giả <code>{DEMO_PHONE}</code> để xem kết quả mô phỏng; không gửi dữ liệu lên máy chủ.</p>
    <div aria-live="polite" id="settlement-feedback" className="mt-5 min-h-10 text-sm leading-7">
      {view.kind === "invalid" && <p>Vui lòng nhập số Việt Nam hợp lệ hoặc số thử nghiệm giả.</p>}
      {view.kind === "empty" && <p>Không có dữ liệu mô phỏng cho số này. Chỉ sử dụng số giả được hiển thị phía trên.</p>}
      {view.kind === "error" && <p>Không thể tra cứu demo lúc này. Vui lòng thử lại.</p>}
      {view.kind === "rate-limited" && <p>Bạn đã thử quá nhiều lần. Vui lòng quay lại sau.</p>}
      {view.kind === "verification-required" && <p>Cần xác minh trước khi tiếp tục tra cứu.</p>}
      {view.kind === "loading" && <p>Đang tra cứu dữ liệu mô phỏng…</p>}
      {view.kind === "success" && <section className="border border-neutral-300 p-5 text-left"><h2 className="mb-3 text-lg font-medium">Báo cáo mô phỏng — không phải quyết toán thật</h2><dl className="grid grid-cols-2 gap-2"><dt>Mã phiếu</dt><dd>{view.report.code}</dd><dt>Ngày gửi</dt><dd>{view.report.receivedAt}</dd><dt>Trạng thái</dt><dd>Đã thanh toán (giả)</dd><dt>Doanh thu</dt><dd>{money.format(view.report.grossAmount)}</dd><dt>Phí</dt><dd>{money.format(view.report.fee)}</dd><dt>Thực nhận</dt><dd>{money.format(view.report.netAmount)}</dd></dl></section>}
    </div>
  </div>;
}
