"use client";

import { useEffect, useRef, useState } from "react";
import { normalizeSettlementQuery } from "@/lib/validation/settlement";
import type { LookupResult } from "@/types/settlement";

type ViewState = LookupResult | { kind: "idle" | "invalid" | "loading" };

export function LookupForm() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewState>({ kind: "idle" });
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.kind === "loading") return;
    const normalized = normalizeSettlementQuery(query);
    if (!normalized) { setView({ kind: "invalid" }); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++generation.current;
    setView({ kind: "loading" });
    try {
      const response = await fetch("/api/settlements/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: normalized }), signal: controller.signal, cache: "no-store" });
      const result: ViewState = await response.json();
      if (current === generation.current) setView(result);
    } catch {
      if (current === generation.current && !controller.signal.aborted) setView({ kind: "error" });
    }
  }

  function change(value: string) {
    generation.current++;
    request.current?.abort();
    request.current = null;
    setQuery(value);
    setView({ kind: "idle" });
  }

  return <div className="mx-auto w-full max-w-[520px] px-6 text-center">
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="settlement-query" className="text-sm tracking-wide">Mã đơn hàng hoặc số điện thoại</label>
      <input id="settlement-query" type="text" autoComplete="off" spellCheck={false} value={query} onChange={event => change(event.target.value)} placeholder="Nhập mã đơn hàng hoặc số điện thoại" aria-invalid={view.kind === "invalid"} aria-describedby="settlement-hint settlement-feedback" className="w-full border border-neutral-300 px-4 py-3 text-base outline-offset-2 focus-visible:outline-2" />
      <button disabled={view.kind === "loading"} type="submit" className="mx-auto min-w-44 cursor-pointer bg-black px-7 py-3 font-[Arial] text-sm uppercase tracking-[2px] text-white disabled:opacity-50">{view.kind === "loading" ? "ĐANG TÌM..." : "TÌM KIẾM"}</button>
    </form>
    <p id="settlement-hint" className="mt-5 text-xs leading-6 text-neutral-600">Dùng mã phiếu được cấp khi gửi hàng hoặc số điện thoại đã đăng ký để xem tình trạng tiếp nhận và quyết toán.</p>
    <div aria-live="polite" id="settlement-feedback" className="mt-5 min-h-10 text-sm leading-7">
      {view.kind === "invalid" && <p>Vui lòng nhập mã đơn hàng hợp lệ hoặc số điện thoại Việt Nam.</p>}
      {view.kind === "empty" && <p>Không tìm thấy phiếu phù hợp. Vui lòng kiểm tra mã đơn hàng hoặc số điện thoại đã đăng ký.</p>}
      {view.kind === "error" && <p>Không thể tra cứu lúc này. Vui lòng thử lại.</p>}
      {view.kind === "rate-limited" && <p>Bạn đã thử quá nhiều lần. Vui lòng quay lại sau.</p>}
      {view.kind === "verification-required" && <p>Cần xác minh trước khi tiếp tục tra cứu.</p>}
      {view.kind === "loading" && <p>Đang tra cứu…</p>}
      {view.kind === "receipts" && <div className="space-y-4 text-left">{view.reports.map(report => <section key={`${report.code}-${report.receivedAt}`} className="border border-neutral-300 p-5"><h2 className="break-all font-semibold">Phiếu {report.code}</h2><p>Ngày gửi: {new Intl.DateTimeFormat("vi-VN").format(new Date(report.receivedAt))}</p><p>Số mặt hàng: {report.itemCount}</p><ul>{report.statuses.map(status => <li key={status.label}>{status.label}: {status.count}</li>)}</ul><p className="mt-3 text-xs text-neutral-600">Phí và số tiền thực nhận chưa được cập nhật trên hệ thống. Vui lòng liên hệ shop để xem bảng quyết toán chi tiết.</p></section>)}</div>}
    </div>
  </div>;
}
