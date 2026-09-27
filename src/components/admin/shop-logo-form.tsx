"use client";
import Image from "next/image";
import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ShopLogoForm({ logoKey, version, shopName }: { logoKey: string | null; version: number; shopName: string }) {
  const router = useRouter(); const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const file = input.current?.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setMessage("Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB."); return; }
    setBusy(true); setMessage("");
    const form = new FormData(); form.set("logo", file); form.set("version", String(version));
    try {
      const response = await fetch("/api/admin/settings/shop/logo", { method: "POST", body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload không thành công.");
      if (input.current) input.current.value = ""; setMessage("Đã cập nhật logo website."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể kết nối máy chủ."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mb-6 grid gap-4 rounded border border-neutral-200 bg-white p-4 sm:p-7">
    <h3 className="font-semibold">Logo tab trình duyệt (favicon)</h3>
    {logoKey ? <Image unoptimized src={`/api/shop/logo/${logoKey}`} alt={`Logo ${shopName}`} width={64} height={64} className="h-16 w-16 object-contain" /> : <p className="text-sm text-neutral-500">Chưa có logo riêng, tab trình duyệt dùng biểu tượng mặc định.</p>}
    <label className="grid gap-2 text-sm">Chọn ảnh logo<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" required disabled={busy} /></label>
    <p className="text-xs text-neutral-500">Chỉ hiển thị trên tab trình duyệt, không thay tên shop ở trang chủ hoặc footer. Tối đa 5 MB; nên dùng ảnh vuông PNG/WebP nền trong suốt.</p>
    <button disabled={busy} type="submit" className="justify-self-start rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">{busy ? "Đang tải…" : "Upload logo"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
