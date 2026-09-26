"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2 } from "lucide-react";

export function ItemGallery({ images, name, itemId, updatedAt, maxImages, maxBytes }: { images: { id: string; storageKey: string; altText: string }[]; name: string; itemId: string; updatedAt: string; maxImages: number; maxBytes: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = uploading || deleting !== null;
  async function uploadImages(files: File[]) {
    if (busy || !files.length) return;
    setError("");
    if (images.length + files.length > maxImages) { setError(`Chỉ được lưu tối đa ${maxImages} ảnh.`); return; }
    if (files.some(file => !file.size || file.size > maxBytes || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) { setError(`Chọn ảnh JPG, PNG hoặc WebP, tối đa ${Math.round(maxBytes / 1024 / 1024)} MB/ảnh.`); return; }
    setUploading(true);
    const form = new FormData();
    form.set("updatedAt", updatedAt); form.set("remove", "[]");
    files.forEach(file => form.append("images", file));
    try {
      const response = await fetch(`/api/admin/items/${encodeURIComponent(itemId)}/images`, { method: "PATCH", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tải ảnh lên.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
      setUploading(false);
    }
  }
  async function deleteImage(imageId: string, index: number) {
    if (busy || !window.confirm(`Xóa ảnh ${index + 1} khỏi mặt hàng? Ảnh đã xóa không thể khôi phục qua giao diện.`)) return;
    setDeleting(imageId); setError("");
    const form = new FormData();
    form.set("updatedAt", updatedAt);
    form.set("remove", JSON.stringify([imageId]));
    try {
      const response = await fetch(`/api/admin/items/${encodeURIComponent(itemId)}/images`, { method: "PATCH", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể xóa ảnh.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể kết nối máy chủ.");
      setDeleting(null);
    }
  }
  const current = images[selected] ?? images[0];
  return <div className="item-gallery">
    <div className="item-gallery__thumbnails" aria-label="Chọn ảnh mặt hàng">
      {images.map((image, index) => <div className="item-gallery__thumbnail-wrap" key={image.id}><button type="button" aria-label={`Xem ảnh ${index + 1} của ${name}`} aria-pressed={index === selected} onClick={() => setSelected(index)} className={`item-gallery__thumbnail ${index === selected ? "is-selected" : ""}`}>
        <Image unoptimized src={`/api/admin/images/${encodeURIComponent(image.storageKey)}`} alt={image.altText || name} width={80} height={120} />
      </button><button type="button" className="item-gallery__delete" aria-label={`Xóa ảnh ${index + 1} của ${name}`} title="Xóa ảnh" disabled={busy} onClick={() => deleteImage(image.id, index)}><Trash2 size={14} aria-hidden="true" /></button></div>)}
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void uploadImages(files); }} />
      <button type="button" className="item-gallery__upload" disabled={busy || images.length >= maxImages} title={images.length >= maxImages ? `Đã đủ ${maxImages} ảnh` : "Chọn ảnh để tải lên ngay"} onClick={() => fileInput.current?.click()}><ImagePlus size={20} aria-hidden="true" /><span>{uploading ? "Đang tải…" : "Thêm ảnh"}</span></button>
    </div>
    {current ? <div className="item-gallery__main"><Image unoptimized src={`/api/admin/images/${encodeURIComponent(current.storageKey)}`} alt={current.altText || name} width={900} height={1200} priority /></div> : <div className="item-gallery__empty">Chưa có ảnh mặt hàng</div>}
    {error && <p role="alert" className="item-gallery__feedback text-sm text-red-700">{error}</p>}
    {deleting && <p role="status" className="item-gallery__feedback text-sm">Đang xóa ảnh…</p>}
    {uploading && <p role="status" className="item-gallery__feedback text-sm">Đang tải ảnh lên…</p>}
  </div>;
}
