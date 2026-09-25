"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IntakeType, ItemStatus } from "@prisma/client";
import { itemStatusLabels, statusActionTargets, type StatusAction } from "@/lib/admin/item-status";

type Action = StatusAction;

export function ItemActions({ id, status }: { id: string; status: ItemStatus; intakeType: IntakeType }) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = (Object.keys(statusActionTargets) as Action[]).filter(option => statusActionTargets[option] !== status);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || busy) return;
    const price = Number(salePrice);
    if (action === "approve" && (!Number.isSafeInteger(price) || price <= 0)) { setError("Giá bán phải là số nguyên dương."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/items/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedStatus: status, ...(action === "approve" ? { salePrice: price } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      if (!response.ok) {
        if (response.status === 409) { setError("Mặt hàng đã được thay đổi bởi quản trị viên khác. Dữ liệu đang được tải lại."); router.refresh(); return; }
        const data: unknown = await response.json().catch(() => null);
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Không thể cập nhật mặt hàng.";
        setError(message); return;
      }
      setAction(null); setReason(""); setSalePrice(""); router.refresh();
    } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  if (!options.length) return null;
  return <section className="my-8 rounded border border-neutral-200 p-5"><h2 className="mb-4 text-lg font-bold">Cập nhật trạng thái</h2>
    <label className="mb-4 grid gap-2 text-sm">
      Trạng thái
      <select value={action ?? ""} disabled={busy} onChange={(event) => {
        const selected = options.find(option => option === event.target.value) ?? null;
        setAction(selected); setError(""); setReason(""); setSalePrice("");
      }} className="min-h-12 w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 disabled:opacity-50">
        <option value="">{itemStatusLabels[status]}</option>
        {options.map(option => <option key={option} value={option}>{itemStatusLabels[statusActionTargets[option]]}</option>)}
      </select>
      <span className="text-xs text-neutral-500">Có thể chọn bất kỳ trạng thái nào khác trạng thái hiện tại.</span>
    </label>
    {action && <form onSubmit={submit} className="grid max-w-md gap-3">
      {action === "approve" && <label className="grid gap-1 text-sm">Giá bán (₫)<input required min="1" step="1" type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="rounded border p-2" /></label>}
      {action !== "approve" && <label className="grid gap-1 text-sm">Ghi chú (không bắt buộc)<textarea maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded border p-2" /></label>}
      {action === "settle" && <p className="text-sm text-neutral-600">Xác nhận shop đã hoàn tất quyết toán. Thao tác này chỉ ghi nhận trạng thái, không thực hiện chuyển tiền.</p>}
      {action === "delete" && <p className="text-sm text-neutral-600">Mặt hàng được đánh dấu đã xóa. Dữ liệu và lịch sử vẫn được giữ lại; bạn có thể đổi sang trạng thái khác để khôi phục.</p>}
      <button type="submit" disabled={busy} className="justify-self-start rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">{busy ? "Đang lưu…" : `Xác nhận ${itemStatusLabels[statusActionTargets[action]].toLowerCase()}`}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
