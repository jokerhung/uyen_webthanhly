"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ShopSettings } from "@/lib/shop/settings";

type Values = Pick<ShopSettings, "announcementText" | "announcementEnabled">;
type Snapshot = Values & Pick<ShopSettings, "version">;
type FieldErrors = Partial<Record<keyof Values, string>>;

const sections = [
  { slug: "shop", label: "Thông tin shop", enabled: true },
  { slug: "announcement", label: "Chữ chạy", enabled: true },
  { slug: "categories", label: "Loại sản phẩm", enabled: true },
  { slug: "brands", label: "Nhãn hiệu", enabled: false },
  { slug: "sizes", label: "Kích thước", enabled: false },
  { slug: "materials", label: "Chất liệu", enabled: false },
] as const;

export function SettingsNavigation() {
  const current = useSelectedLayoutSegment();
  return <nav aria-label="Các mục cấu hình" className="mb-7 overflow-x-auto border-b border-neutral-200">
    <div className="flex min-w-max gap-1 pb-2 text-sm">
      {sections.map(section => section.enabled
        ? <Link key={section.slug} href={`/admin/settings/${section.slug}`} aria-current={current === section.slug ? "page" : undefined} className={`rounded px-3 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 ${current === section.slug ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}>{section.label}</Link>
        : <span key={section.slug} aria-disabled="true" title="Chưa khả dụng" className="cursor-not-allowed rounded px-3 py-2 text-neutral-500">{section.label} <span className="text-xs">(sắp có)</span></span>)}
    </div>
  </nav>;
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Snapshot>;
  return typeof candidate.announcementText === "string" && typeof candidate.announcementEnabled === "boolean" && typeof candidate.version === "number";
}

function readSettings(body: unknown): Snapshot | null {
  if (!body || typeof body !== "object" || !("settings" in body)) return null;
  return isSnapshot(body.settings) ? body.settings : null;
}

function parseFieldErrors(body: unknown): FieldErrors {
  const result: FieldErrors = {};
  if (!body || typeof body !== "object" || !("fieldErrors" in body) || !body.fieldErrors || typeof body.fieldErrors !== "object") return result;
  const errors = body.fieldErrors as Record<string, unknown>;
  for (const field of ["announcementText", "announcementEnabled"] as const) {
    const messages = errors[field];
    if (Array.isArray(messages) && typeof messages[0] === "string") result[field] = messages[0];
  }
  return result;
}

function valuesFrom(snapshot: Snapshot): Values {
  return { announcementText: snapshot.announcementText, announcementEnabled: snapshot.announcementEnabled };
}

export function AnnouncementSettingsForm({ initialSettings }: { initialSettings: ShopSettings }) {
  const [saved, setSaved] = useState<Snapshot>(initialSettings);
  const [values, setValues] = useState<Values>(() => valuesFrom(initialSettings));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const changed = values.announcementText !== saved.announcementText || values.announcementEnabled !== saved.announcementEnabled;

  function cancel() {
    setValues(valuesFrom(saved));
    setErrors({});
    setMessage("");
    // A conflict warning stays visible until the administrator explicitly acknowledges it.
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed) return;
    const found: FieldErrors = {};
    if (values.announcementText.length > 500) found.announcementText = "Nội dung không được vượt quá 500 ký tự.";
    if (values.announcementEnabled && !values.announcementText.trim()) found.announcementText = "Nhập nội dung trước khi bật chữ chạy.";
    setErrors(found);
    setMessage("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/settings/announcement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, expectedVersion: saved.version }),
      });
      if (response.status === 409) {
        setWarning("Cấu hình đã được quản trị viên khác thay đổi. Đang tải phiên bản mới nhất; kiểm tra lại trước khi lưu.");
        const latestResponse = await fetch("/api/admin/settings/announcement", { cache: "no-store" });
        const latest = latestResponse.ok ? readSettings(await latestResponse.json().catch(() => null)) : null;
        if (!latest) {
          setWarning("Cấu hình đã được quản trị viên khác thay đổi nhưng không thể tải phiên bản mới. Bản nháp chưa bị xóa; hãy tải lại trang trước khi lưu.");
          return;
        }
        setSaved(latest);
        setValues(valuesFrom(latest));
        setErrors({});
        setWarning("Cấu hình đã được quản trị viên khác thay đổi. Đã tải phiên bản mới nhất; các chỉnh sửa chưa lưu của bạn không được áp dụng. Vui lòng kiểm tra rồi chỉnh sửa lại.");
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 422) setErrors(parseFieldErrors(body));
        setMessage("Không thể lưu chữ chạy. Vui lòng kiểm tra thông tin và thử lại.");
        return;
      }
      const latest = readSettings(body);
      if (!latest) throw new Error("invalid-response");
      setSaved(latest);
      setValues(valuesFrom(latest));
      setErrors({});
      setWarning("");
      setMessage("Đã lưu cấu hình chữ chạy.");
    } catch {
      setMessage("Không thể tải hoặc lưu cấu hình. Vui lòng kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} noValidate className="grid gap-6 rounded border border-neutral-200 bg-white p-4 sm:p-7">
    <div className="grid gap-2">
      <label htmlFor="announcementText" className="text-sm font-medium">Nội dung chữ chạy</label>
      <textarea id="announcementText" name="announcementText" rows={4} maxLength={500} disabled={busy} value={values.announcementText} onChange={event => {
        setValues(previous => ({ ...previous, announcementText: event.target.value }));
        setErrors(previous => ({ ...previous, announcementText: undefined }));
        setMessage("");
      }} aria-invalid={!!errors.announcementText} aria-describedby={`announcement-help${errors.announcementText ? " announcementText-error" : ""}`} className="min-h-28 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 disabled:opacity-60" />
      <p id="announcement-help" className="text-sm text-neutral-600">Chỉ văn bản thuần · {values.announcementText.length}/500 ký tự. Cần nhập nội dung khi bật chữ chạy.</p>
      {errors.announcementText && <p id="announcementText-error" className="text-sm text-red-700">{errors.announcementText}</p>}
    </div>
    <div>
      <label htmlFor="announcementEnabled" className="flex w-fit cursor-pointer items-center gap-3 text-sm font-medium">
        <input id="announcementEnabled" name="announcementEnabled" type="checkbox" role="switch" checked={values.announcementEnabled} disabled={busy} onChange={event => {
          setValues(previous => ({ ...previous, announcementEnabled: event.target.checked }));
          setErrors(previous => ({ ...previous, announcementEnabled: undefined }));
          setMessage("");
        }} aria-invalid={!!errors.announcementEnabled} aria-describedby={errors.announcementEnabled ? "announcementEnabled-error" : undefined} className="h-5 w-5 accent-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800" />
        Bật chữ chạy trên trang công khai
      </label>
      {errors.announcementEnabled && <p id="announcementEnabled-error" className="mt-2 text-sm text-red-700">{errors.announcementEnabled}</p>}
    </div>
    <div className="grid gap-2 border-t border-neutral-200 pt-5">
      <h3 className="font-semibold">Xem trước</h3>
      {values.announcementEnabled
        ? <div role="region" aria-label="Xem trước chữ chạy" className="max-w-full overflow-hidden border px-4 py-3 text-sm" style={{ backgroundColor: "var(--brand-primary)", color: "var(--on-brand)", borderColor: "var(--border)" }}>
          <p className="break-words leading-relaxed tracking-widest">{values.announcementText.trim() ? <>✦ {values.announcementText}</> : "Nhập nội dung để xem trước chữ chạy."}</p>
        </div>
        : <p className="rounded border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-700">Chữ chạy đang tắt; thanh sẽ không hiển thị.</p>}
      <p className="text-xs text-neutral-600">Xem trước dùng màu thương hiệu đã lưu trong Thông tin shop; nội dung đứng yên và không xử lý mã HTML.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-5">
      <button type="submit" disabled={busy || !changed} className="rounded bg-neutral-900 px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
      <button type="button" onClick={cancel} disabled={busy || !changed} className="rounded border border-neutral-300 px-5 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">Hủy thay đổi</button>
      {message && <p role="status" aria-live="polite" className="w-full text-sm text-neutral-800">{message}</p>}
      {warning && <p role="alert" className="w-full rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{warning} <button type="button" onClick={() => setWarning("")} className="ml-2 underline focus-visible:outline-2 focus-visible:outline-offset-2">Đã hiểu</button></p>}
    </div>
  </form>;
}
