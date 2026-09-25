"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return <button type="button" disabled={busy} onClick={async () => {
    setBusy(true);
    try { const response = await fetch("/api/admin/session", { method: "DELETE" }); if (!response.ok) throw new Error("Logout failed"); router.replace("/admin/login"); router.refresh(); }
    catch { setBusy(false); alert("Không thể đăng xuất. Vui lòng thử lại."); }
  }} className="rounded border px-4 py-2 hover:bg-neutral-100 disabled:opacity-50">Đăng xuất</button>;
}
