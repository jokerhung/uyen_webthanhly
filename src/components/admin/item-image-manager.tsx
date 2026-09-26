"use client";
import Image from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, Undo2 } from "lucide-react";

export function ItemImageManager({ id, updatedAt, images, maxImages, maxBytes }: { id: string; updatedAt: string; images: { id: string; storageKey: string; altText: string }[]; maxImages: number; maxBytes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]), [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function save() {
    if (busy) return;
    if (images.length - removed.length + files.length > maxImages) { setError(`Chỉ được giữ tối đa ${maxImages} ảnh.`); return; }
    if (removed.length && !window.confirm(`Xóa ${removed.length} ảnh đã chọn khỏi mặt hàng? Ảnh bị xóa không thể khôi phục qua giao diện.`)) return;
    setBusy(true); setError("");
    const form = new FormData(); form.set("updatedAt", updatedAt); form.set("remove", JSON.stringify(removed)); files.forEach(file => form.append("images", file));
    try {
      const response = await fetch(`/api/admin/items/${id}/images`, { method: "PATCH", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể cập nhật ảnh.");
      setRemoved([]); setFiles([]); setOpen(false); if (input.current) input.current.value = "";
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Không thể kết nối máy chủ."); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 border-t border-neutral-200 pt-4">
    <button type="button" className="inline-flex items-center gap-2 text-sm" aria-expanded={open} disabled={busy} onClick={() => setOpen(!open)}><ImagePlus size={17} />Quản lý ảnh ({images.length})</button>
    {open && <div className="mt-4 space-y-4">
      <p className="text-xs text-neutral-500">JPG, PNG, WebP · Tối đa {maxImages} ảnh · {Math.round(maxBytes / 1024 / 1024)} MB/ảnh. Thay đổi chỉ áp dụng khi bấm Lưu ảnh.</p>
      <div className="flex flex-wrap gap-3">{images.map(image => <div key={image.id} className="grid gap-2"><Image unoptimized src={`/api/admin/images/${image.storageKey}`} alt={image.altText} width={96} height={120} className={`h-[120px] w-24 object-cover ${removed.includes(image.id) ? "opacity-30" : ""}`} /><button type="button" disabled={busy} className="inline-flex items-center justify-center gap-1 text-xs" onClick={() => setRemoved(previous => previous.includes(image.id) ? previous.filter(value => value !== image.id) : [...previous, image.id])}>{removed.includes(image.id) ? <><Undo2 size={14} />Giữ lại</> : <><Trash2 size={14} />Xóa ảnh</>}</button></div>)}</div>
      <label className="grid gap-2 text-sm">Thêm ảnh<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={event => { const added = Array.from(event.target.files ?? []); if (added.some(file => file.size > maxBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError("Ảnh không hợp lệ hoặc vượt dung lượng cho phép."); event.target.value = ""; return; } setFiles(previous => [...previous, ...added]); setError(""); event.target.value = ""; }} /></label>
      {files.map((file, index) => <div key={`${index}-${file.name}`} className="flex items-center justify-between gap-2 text-xs"><span className="break-all">{file.name}</span><button type="button" disabled={busy} onClick={() => setFiles(previous => previous.filter((_, at) => at !== index))}>Bỏ chọn</button></div>)}
      <button type="button" disabled={busy || (!removed.length && !files.length)} onClick={save} className="bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40">{busy ? "Đang lưu…" : "Lưu ảnh"}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>}
  </section>;
}
