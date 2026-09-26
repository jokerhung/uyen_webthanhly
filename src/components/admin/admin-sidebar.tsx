"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, Settings, Menu } from "lucide-react";
import { LogoutButton } from "./logout-button";
import "./admin-sidebar.css";

const settings = [
  { label: "Thông tin shop", href: "/admin/settings/shop", available: true },
  { label: "Chữ chạy", href: "/admin/settings/announcement", available: false },
  { label: "Loại sản phẩm", href: "/admin/settings/categories", available: false },
  { label: "Nhãn hiệu", href: "/admin/settings/brands", available: false },
  { label: "Kích thước", href: "/admin/settings/sizes", available: false },
  { label: "Chất liệu", href: "/admin/settings/materials", available: false },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const active = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  return <details className="admin-sidebar" key={pathname}>
    <summary><Menu size={20} aria-hidden="true" /> Menu quản trị</summary>
    <div className="admin-sidebar__body">
      <Link href="/admin" className="admin-sidebar__brand">Quản trị cửa hàng</Link>
      <nav aria-label="Quản trị">
        <Link className="admin-sidebar__link" href="/admin/items" aria-current={active("/admin/items") ? "page" : undefined}><Boxes size={18} />Mặt hàng</Link>
        <Link className="admin-sidebar__link" href="/admin/consignments" aria-current={active("/admin/consignments") ? "page" : undefined}><ClipboardList size={18} />Phiếu tiếp nhận</Link>
        <div className="admin-sidebar__group"><Settings size={18} />Cấu hình</div>
        <div className="admin-sidebar__settings">{settings.map(item => item.available
          ? <Link className="admin-sidebar__link" key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined}>{item.label}</Link>
          : <span className="admin-sidebar__unavailable" key={item.href} aria-disabled="true">{item.label}<small>Sắp triển khai</small></span>)}</div>
      </nav>
      <div className="admin-sidebar__logout"><LogoutButton /></div>
    </div>
  </details>;
}
