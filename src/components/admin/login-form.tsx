"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!response.ok) { setError(response.status === 429 ? "Thử lại sau ít phút." : "Không thể đăng nhập. Kiểm tra tài khoản hoặc liên hệ quản trị viên."); return; }
      setPassword("");
      router.replace("/admin/consignments");
      router.refresh();
    } catch { setError("Không thể kết nối máy chủ."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid gap-4 rounded border border-neutral-200 bg-white p-6 shadow-sm">
    <label className="grid gap-1 text-sm font-semibold">Email hoặc tài khoản local<input required autoComplete="username" type="text" value={email} onChange={event => setEmail(event.target.value)} className="rounded border p-2 font-normal" /></label>
    <label className="grid gap-1 text-sm font-semibold">Mật khẩu<input required autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} className="rounded border p-2 font-normal" /></label>
    <button type="submit" disabled={busy} className="rounded bg-neutral-900 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Đang xác thực…" : "Đăng nhập"}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form>;
}
