import Image from "next/image";
import Link from "next/link";
import { ItemStatus } from "@prisma/client";
import { LogoutButton } from "./logout-button";
import { itemStatusLabels } from "@/lib/admin/item-status";


export function AdminNav() {
  return <nav aria-label="Quản trị" className="mb-8 flex flex-wrap gap-3 border-b border-neutral-200 pb-4 text-sm font-semibold">
    <Link className="rounded border px-4 py-2 hover:bg-neutral-100" href="/admin/items">Mặt hàng</Link>
    <Link className="rounded border px-4 py-2 hover:bg-neutral-100" href="/admin/consignments">Phiếu tiếp nhận</Link>
    <LogoutButton />
  </nav>;
}

export function AdminPage({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return <main className={className ?? "container-site py-10"}><AdminNav /><h1 className="mb-7 text-2xl font-bold">{title}</h1>{children}</main>;
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800">{itemStatusLabels[status]}</span>;
}

export function money(value: { toString(): string } | null | undefined) {
  return value == null ? "—" : `${new Intl.NumberFormat("vi-VN").format(Number(value.toString()))} ₫`;
}

export function date(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(value);
}

export function ItemThumbnail({ storageKey, alt, size = 64 }: { storageKey?: string | null; alt: string; size?: number }) {
  return storageKey ? <Image unoptimized src={`/api/admin/images/${encodeURIComponent(storageKey)}`} alt={alt} width={size} height={size} className="rounded border border-neutral-200 object-cover" style={{ width: size, height: size }} />
    : <span aria-label="Chưa có ảnh" className="flex shrink-0 items-center justify-center rounded bg-neutral-100 text-xs text-neutral-500" style={{ width: size, height: size }}>Chưa có ảnh</span>;
}

export function Pagination({ page, totalPages, href }: { page: number; totalPages: number; href: (page: number) => string }) {
  if (totalPages <= 1) return null;
  return <nav aria-label="Phân trang" className="mt-6 flex items-center justify-between gap-4 text-sm">
    {page > 1 ? <Link className="rounded border px-4 py-2" href={href(page - 1)}>← Trước</Link> : <span />}
    <span>Trang {page} / {totalPages}</span>
    {page < totalPages ? <Link className="rounded border px-4 py-2" href={href(page + 1)}>Tiếp →</Link> : <span />}
  </nav>;
}
