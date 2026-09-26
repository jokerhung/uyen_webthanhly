"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import type { IntakeType, ItemStatus } from "@prisma/client";
import { itemStatusLabels, statusActionTargets, type StatusAction } from "@/lib/admin/item-status";

type Action = StatusAction | "edit";
import type { ListingOptions, ListingSelection } from "@/types/listing-options";
const listingLabels: Record<keyof ListingOptions, string> = { genderId: "Giới tính", seasonId: "Mùa", category: "Danh mục", materialId: "Chất liệu", sizeId: "Kích thước", brandId: "Nhãn hiệu", priceOptionId: "Giá bán (₫)" };

export function ItemActions({ id, status, listingOptions, inactiveCategory, initialListing, initialSalePrice = "", editor, children }: { id: string; status: ItemStatus; intakeType: IntakeType; listingOptions: ListingOptions; inactiveCategory?: { id: string; label: string }; initialListing: ListingSelection; initialSalePrice?: string; editor?: { description: string; condition: string; salePrice: string; updatedAt: string }; children?: ReactNode }) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [listing, setListing] = useState<ListingSelection>(() => Object.fromEntries(Object.entries(initialListing).map(([key, value]) => [key, listingOptions[key as keyof ListingOptions].some(option => option.id === value) ? value : ""])) as ListingSelection);
  const [description, setDescription] = useState(editor?.description ?? "");
  const [condition, setCondition] = useState(editor?.condition ?? "");
  const [salePrice, setSalePrice] = useState(editor?.salePrice ?? initialSalePrice);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const options = (Object.keys(statusActionTargets) as StatusAction[]).filter(option => statusActionTargets[option] !== status);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || busy) return;
    if ((action === "approve" || action === "edit") && Object.keys(listingLabels).filter(key => key !== "priceOptionId").some(key => !listingOptions[key as keyof ListingOptions].some(option => option.id === listing[key as keyof ListingSelection]))) { setError("Vui lòng chọn đầy đủ thông tin đăng bán."); return; }
    if ((action === "edit" || action === "approve") && (!/^\d{1,14}$/.test(salePrice.trim()) || Number(salePrice) <= 0)) { setError("Giá bán phải là số nguyên dương, tối đa 14 chữ số."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/items/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedStatus: status, ...((action === "approve" || action === "edit") ? Object.fromEntries(Object.entries(listing).filter(([key]) => key !== "priceOptionId")) : {}), ...((action === "approve" || action === "edit") ? { salePrice: Number(salePrice) } : {}), ...(action === "edit" ? { description, condition, expectedUpdatedAt: editor?.updatedAt } : {}), ...(action !== "approve" && action !== "edit" && reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      if (!response.ok) {
        if (response.status === 409) { setError("Mặt hàng đã được thay đổi bởi quản trị viên khác. Dữ liệu đang được tải lại."); router.refresh(); return; }
        const data: unknown = await response.json().catch(() => null);
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Không thể cập nhật mặt hàng.";
        setError(message); return;
      }
      setAction(null); setReason(""); router.refresh();
    } catch { setError("Không thể kết nối. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  if (!options.length) return null;
  return <section className={editor ? "item-workspace__section" : "my-8 rounded border border-neutral-200 p-5"}>
    {editor && <div className="flex items-center gap-2 mb-3"><h2 className="text-xl font-bold">Mô tả</h2><button type="button" aria-label="Chỉnh sửa mô tả" title="Chỉnh sửa mô tả" aria-expanded={action === "edit"} disabled={busy || action === "edit"} className="inline-flex h-8 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40" onClick={() => { setAction("edit"); setError(""); }}><Pencil size={16} aria-hidden="true" /></button></div>}
    {editor && !action && <div className="item-workspace__section-body">{children}</div>}
    {!editor && <label className="mb-4 grid gap-2 text-sm">
      Trạng thái
      <select value={action ?? ""} disabled={busy} onChange={(event) => {
        const selected = options.find(option => option === event.target.value) ?? null;
        setAction(selected); setError(""); setReason("");
      }} className="min-h-12 w-full border border-neutral-300 bg-white px-3 py-2 text-neutral-900 disabled:opacity-50">
        <option value="">{itemStatusLabels[status]}</option>
        {options.map(option => <option key={option} value={option}>{itemStatusLabels[statusActionTargets[option]]}</option>)}
      </select>
      <span className="text-xs text-neutral-500">Có thể chọn bất kỳ trạng thái nào khác trạng thái hiện tại.</span>
    </label>}
    {action && <form onSubmit={submit} className="grid max-w-md gap-3">
      {(action === "edit" || action === "approve") && inactiveCategory && <p role="status" className="text-sm text-amber-900">Danh mục hiện tại: {inactiveCategory.label}. Chọn danh mục đang hoạt động để lưu; hệ thống không tự đổi lựa chọn.</p>}
      {action === "edit" && <><label className="grid gap-1 text-sm">Mô tả *<textarea required disabled={busy} maxLength={4000} rows={4} value={description} onChange={event => setDescription(event.target.value)} className="border p-2" /></label><label className="grid gap-1 text-sm">Tình trạng *<input required disabled={busy} maxLength={200} value={condition} onChange={event => setCondition(event.target.value)} className="border p-2" /></label></>}
      {(action === "approve" || action === "edit") && (Object.keys(listingLabels) as (keyof ListingOptions)[]).filter(field => field !== "priceOptionId").map(field => <label key={field} className="grid gap-1 text-sm">{listingLabels[field]} *<select required disabled={busy} value={listing[field]} onChange={event => setListing(previous => ({ ...previous, [field]: event.target.value }))} className="min-h-11 w-full border border-neutral-300 bg-white p-2"><option value="">{field === "category" && inactiveCategory ? inactiveCategory.label : `Chọn ${listingLabels[field].toLowerCase()}`}</option>{listingOptions[field].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>{!listingOptions[field].length && <span className="text-red-700">Danh mục chưa có giá trị đang hoạt động.</span>}</label>)}
      {(action === "edit" || action === "approve") && <label className="grid gap-1 text-sm">Giá bán (₫) *<input type="text" inputMode="numeric" required pattern="[0-9]{1,14}" maxLength={14} disabled={busy} value={salePrice} onChange={event => setSalePrice(event.target.value)} className="min-h-11 border p-2" placeholder="Nhập giá bán" /></label>}
      {action !== "approve" && action !== "edit" && <label className="grid gap-1 text-sm">Ghi chú (không bắt buộc)<textarea maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded border p-2" /></label>}
      {action === "settle" && <p className="text-sm text-neutral-600">Xác nhận shop đã hoàn tất quyết toán. Thao tác này chỉ ghi nhận trạng thái, không thực hiện chuyển tiền.</p>}
      {action === "delete" && <p className="text-sm text-neutral-600">Mặt hàng được đánh dấu đã xóa. Dữ liệu và lịch sử vẫn được giữ lại; bạn có thể đổi sang trạng thái khác để khôi phục.</p>}
      <button type="submit" disabled={busy} className="justify-self-start rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">{busy ? "Đang lưu…" : action === "edit" ? "Lưu mô tả" : `Xác nhận ${itemStatusLabels[statusActionTargets[action]].toLowerCase()}`}</button>
      {editor && <button type="button" disabled={busy} className="border px-4 py-2 text-sm" onClick={() => { setAction(null); setError(""); setDescription(editor.description); setCondition(editor.condition); setSalePrice(editor.salePrice); setListing(Object.fromEntries(Object.entries(initialListing).map(([key, value]) => [key, listingOptions[key as keyof ListingOptions].some(option => option.id === value) ? value : ""])) as ListingSelection); }}>Hủy</button>}
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
