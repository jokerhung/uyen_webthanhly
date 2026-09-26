"use client";

import { useState, type FormEvent } from "react";
import type { ShopSettings } from "@/lib/shop/settings";
import { normalizeVietnamesePhone } from "@/lib/validation/settlement";

type Field = "shopName" | "primaryColor" | "backgroundColor" | "surfaceColor" | "address" | "facebookUrl" | "phone" | "opensAt" | "closesAt";
type Values = Pick<ShopSettings, Field>;
type ErrorMap = Partial<Record<Field, string>>;
type SettingsSnapshot = Values & Pick<ShopSettings, "version">;

const fields: Field[] = ["shopName", "primaryColor", "backgroundColor", "surfaceColor", "address", "facebookUrl", "phone", "opensAt", "closesAt"];
const colors = [
  { field: "primaryColor", label: "Màu thương hiệu" },
  { field: "backgroundColor", label: "Màu nền" },
  { field: "surfaceColor", label: "Màu bề mặt" },
] as const;
const hexPattern = /^#[0-9a-fA-F]{6}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const control = "min-h-11 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 disabled:opacity-60";

function extract(snapshot: SettingsSnapshot): Values {
  return Object.fromEntries(fields.map(field => [field, snapshot[field]])) as Values;
}

function isSnapshot(value: unknown): value is SettingsSnapshot {
  return !!value && typeof value === "object" && typeof (value as SettingsSnapshot).version === "number"
    && fields.every(field => typeof (value as SettingsSnapshot)[field] === "string");
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function textOn(color: string): string {
  return contrast(color, "#ffffff") >= contrast(color, "#171717") ? "#ffffff" : "#171717";
}

function validate(values: Values): ErrorMap {
  const errors: ErrorMap = {};
  if (!values.shopName.trim() || values.shopName.trim().length > 120) errors.shopName = "Tên shop cần từ 1 đến 120 ký tự.";
  if (!values.address.trim() || values.address.trim().length > 500) errors.address = "Địa chỉ cần từ 1 đến 500 ký tự.";
  for (const { field } of colors) if (!hexPattern.test(values[field])) errors[field] = "Nhập màu theo dạng #RRGGBB.";
  try {
    const url = new URL(values.facebookUrl);
    if (url.protocol !== "https:" || url.username || url.password || !/^(facebook\.com|www\.facebook\.com|m\.facebook\.com)$/i.test(url.hostname) || !!url.port) throw new Error("Invalid Facebook URL");
  } catch { errors.facebookUrl = "Nhập URL HTTPS Facebook hợp lệ, không có tài khoản trong liên kết."; }
  if (!normalizeVietnamesePhone(values.phone)) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ (10 chữ số hoặc +84).";
  if (!timePattern.test(values.opensAt)) errors.opensAt = "Giờ mở cửa phải có dạng HH:mm.";
  if (!timePattern.test(values.closesAt)) errors.closesAt = "Giờ đóng cửa phải có dạng HH:mm.";
  if (!errors.opensAt && !errors.closesAt && values.opensAt === values.closesAt) errors.closesAt = "Giờ đóng cửa phải khác giờ mở cửa.";
  return errors;
}

function fieldError(error: string | undefined, field: Field) {
  return error ? <span id={`${field}-error`} className="text-sm text-red-700">{error}</span> : null;
}

export function ShopSettingsForm({ initialSettings }: { initialSettings: ShopSettings }) {
  const [saved, setSaved] = useState<SettingsSnapshot>(initialSettings);
  const [values, setValues] = useState<Values>(() => extract(initialSettings));
  const [errors, setErrors] = useState<ErrorMap>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const changed = fields.some(field => values[field] !== saved[field]);
  const validColors = colors.every(({ field }) => hexPattern.test(values[field]));
  const nextDay = timePattern.test(values.opensAt) && timePattern.test(values.closesAt) && values.closesAt < values.opensAt;

  function setField(field: Field, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setMessage("");
  }

  function cancel() {
    setValues(extract(saved));
    setErrors({});
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) { setMessage("Vui lòng kiểm tra các trường được đánh dấu."); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings/shop", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, expectedVersion: saved.version }),
      });
      if (response.status === 409) {
        const latestResponse = await fetch("/api/admin/settings/shop", { cache: "no-store" });
        if (!latestResponse.ok) throw new Error("reload-failed");
        const latest: unknown = await latestResponse.json();
        const snapshot = latest && typeof latest === "object" && "settings" in latest ? latest.settings : latest;
        if (!isSnapshot(snapshot)) throw new Error("reload-failed");
        setSaved(snapshot); setValues(extract(snapshot)); setErrors({});
        setMessage("Cấu hình đã được quản trị viên khác cập nhật. Đã tải phiên bản mới nhất; vui lòng kiểm tra trước khi chỉnh sửa lại.");
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (body && typeof body === "object") {
          const result = body as { error?: unknown; fieldErrors?: unknown };
          if (result.fieldErrors && typeof result.fieldErrors === "object") {
            const mapped: ErrorMap = {};
            for (const field of fields) {
              const error = (result.fieldErrors as Record<string, unknown>)[field];
              if (typeof error === "string") mapped[field] = error;
              else if (Array.isArray(error) && typeof error[0] === "string") mapped[field] = error[0];
            }
            setErrors(mapped);
          }
          setMessage(typeof result.error === "string" ? result.error : "Không thể lưu cấu hình. Vui lòng kiểm tra lại.");
        } else setMessage("Không thể lưu cấu hình. Vui lòng thử lại.");
        return;
      }
      const snapshot = body && typeof body === "object" && "settings" in body ? body.settings : body;
      if (!isSnapshot(snapshot)) throw new Error("invalid-response");
      setSaved(snapshot); setValues(extract(snapshot)); setErrors({});
      setMessage("Đã lưu cấu hình shop.");
    } catch {
      setMessage("Không thể tải hoặc lưu cấu hình. Vui lòng kiểm tra kết nối rồi thử lại.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} noValidate className="grid gap-7 rounded border border-neutral-200 bg-white p-4 sm:p-7">
    <div className="grid gap-5 sm:grid-cols-2">
      <label htmlFor="shopName" className="grid gap-1 text-sm font-medium">Tên shop *
        <input id="shopName" name="shopName" required maxLength={120} disabled={busy} value={values.shopName} onChange={event => setField("shopName", event.target.value)} aria-invalid={!!errors.shopName} aria-describedby={errors.shopName ? "shopName-error" : undefined} className={control} />
        {fieldError(errors.shopName, "shopName")}
      </label>
      <label htmlFor="phone" className="grid gap-1 text-sm font-medium">Số điện thoại shop *
        <input id="phone" name="phone" type="tel" required disabled={busy} value={values.phone} onChange={event => setField("phone", event.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} className={control} />
        {fieldError(errors.phone, "phone")}
      </label>
    </div>
    <label htmlFor="address" className="grid gap-1 text-sm font-medium">Địa chỉ *
      <textarea id="address" name="address" rows={2} maxLength={500} required disabled={busy} value={values.address} onChange={event => setField("address", event.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? "address-error" : undefined} className={control} />
      {fieldError(errors.address, "address")}
    </label>
    <label htmlFor="facebookUrl" className="grid gap-1 text-sm font-medium">Liên kết Facebook *
      <input id="facebookUrl" name="facebookUrl" type="url" inputMode="url" required disabled={busy} value={values.facebookUrl} onChange={event => setField("facebookUrl", event.target.value)} aria-invalid={!!errors.facebookUrl} aria-describedby={errors.facebookUrl ? "facebookUrl-error" : undefined} className={control} />
      {fieldError(errors.facebookUrl, "facebookUrl")}
    </label>
    <fieldset className="grid gap-4 border-t border-neutral-200 pt-6">
      <legend className="text-base font-semibold">Giờ hoạt động hằng ngày</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {([{"field":"opensAt","label":"Giờ mở cửa"},{"field":"closesAt","label":"Giờ đóng cửa"}] as const).map(({ field, label }) => <label key={field} htmlFor={field} className="grid gap-1 text-sm font-medium">{label} *
          <input id={field} name={field} type="time" required disabled={busy} value={values[field]} onChange={event => setField(field, event.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined} className={control} />
          {fieldError(errors[field], field)}
        </label>)}
      </div>
      <p className="text-sm text-neutral-600">{nextDay ? `Đóng cửa lúc ${values.closesAt} ngày hôm sau (mở lúc ${values.opensAt}).` : "Nếu giờ đóng cửa sớm hơn giờ mở cửa, cửa hàng đóng vào ngày hôm sau."}</p>
    </fieldset>
    <fieldset className="grid gap-4 border-t border-neutral-200 pt-6">
      <legend className="text-base font-semibold">Màu sắc cửa hàng</legend>
      <p className="text-sm text-neutral-600">Chọn màu hoặc nhập mã hex gồm 6 ký tự, ví dụ #8B5E3C.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {colors.map(({ field, label }) => <div key={field} className="grid gap-1 text-sm font-medium">
          <label htmlFor={`${field}-hex`}>{label} *</label>
          <div className="flex items-center gap-2">
            <input id={`${field}-picker`} type="color" aria-label={`Chọn ${label.toLowerCase()}`} disabled={busy} value={hexPattern.test(values[field]) ? values[field] : "#000000"} onChange={event => setField(field, event.target.value.toUpperCase())} className="h-11 w-12 shrink-0 cursor-pointer rounded border border-neutral-300 bg-white p-1" />
            <input id={`${field}-hex`} name={field} type="text" inputMode="text" required spellCheck={false} maxLength={7} disabled={busy} value={values[field]} onChange={event => setField(field, event.target.value)} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `${field}-error` : undefined} placeholder="#RRGGBB" className={control} />
          </div>
          {fieldError(errors[field], field)}
        </div>)}
      </div>
      <div aria-label="Xem trước màu sắc và độ tương phản" className="rounded border border-neutral-300 p-4" style={validColors ? { backgroundColor: values.backgroundColor, color: textOn(values.backgroundColor) } : undefined}>
        <p className="mb-2 text-sm font-semibold">Xem trước màu sắc</p>
        {validColors ? <div className="rounded p-4" style={{ backgroundColor: values.surfaceColor, color: textOn(values.surfaceColor) }}>
          <p className="mb-2 font-semibold">{values.shopName || "Tên shop"}</p>
          <p className="mb-3 text-sm">Nội dung mẫu trên bề mặt cửa hàng.</p>
          <span className="inline-block rounded px-4 py-2 text-sm font-semibold" style={{ backgroundColor: values.primaryColor, color: textOn(values.primaryColor) }}>Nút mẫu</span>
          <p className="mt-3 text-xs">Tương phản chữ/nền: {contrast(values.backgroundColor, textOn(values.backgroundColor)).toFixed(1)}:1 · chữ/bề mặt: {contrast(values.surfaceColor, textOn(values.surfaceColor)).toFixed(1)}:1 · chữ/nút: {contrast(values.primaryColor, textOn(values.primaryColor)).toFixed(1)}:1.</p>
          {contrast(values.primaryColor, values.surfaceColor) < 3 && <p className="mt-2 text-xs font-semibold">Lưu ý: màu nút và màu bề mặt tương phản thấp ({contrast(values.primaryColor, values.surfaceColor).toFixed(1)}:1). Hãy cân nhắc chọn màu dễ phân biệt hơn.</p>}
        </div> : <p className="text-sm">Nhập đủ ba mã màu #RRGGBB hợp lệ để xem trước.</p>}
      </div>
    </fieldset>
    <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-5">
      <button type="submit" disabled={busy || !changed} className="rounded bg-neutral-900 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
      <button type="button" onClick={cancel} disabled={busy || !changed} className="rounded border border-neutral-300 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50">Hủy thay đổi</button>
      {message && <p role="status" aria-live="polite" className="w-full text-sm text-neutral-800">{message}</p>}
    </div>
  </form>;
}
