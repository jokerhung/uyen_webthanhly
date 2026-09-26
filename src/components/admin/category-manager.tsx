"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type Category = { slug: string; name: string; active: boolean; sortOrder: number; itemCount: number };
type Filter = "all" | "active" | "inactive";

type CategoryManagerProps = {
  endpoint?: string;
  itemLabel?: string;
};

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<Category>;
  return typeof row.slug === "string" && typeof row.name === "string" && typeof row.active === "boolean"
    && typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
    && typeof row.itemCount === "number" && Number.isInteger(row.itemCount) && row.itemCount >= 0;
}

function readCategories(value: unknown): Category[] | null {
  if (!value || typeof value !== "object" || !("categories" in value)) return null;
  const rows = value.categories;
  return Array.isArray(rows) && rows.every(isCategory) ? rows : null;
}

function responseError(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const data = body as { error?: unknown; fieldErrors?: { name?: unknown } };
  const nameError = data.fieldErrors?.name;
  if (Array.isArray(nameError) && typeof nameError[0] === "string") return nameError[0];
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  return fallback;
}

export function CategoryManager({ endpoint = "/api/admin/settings/categories", itemLabel = "loại sản phẩm" }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const addTriggerRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store", signal });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403
        ? "Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại rồi thử tiếp."
        : "Không thể tải danh sách. Vui lòng thử lại.");
      const rows = readCategories(await response.json());
      if (!rows) throw new Error("Dữ liệu danh sách không hợp lệ. Vui lòng thử lại.");
      setCategories(rows);
      setError("");
      return true;
    } catch (cause) {
      if (signal?.aborted) return false;
      setCategories(null); // Do not offer actions on a potentially stale state.
      setError(cause instanceof Error ? cause.message : "Không thể tải danh sách. Vui lòng thử lại.");
      return false;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();
    // Defer the initial request so the effect itself does not synchronously update state.
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) void refresh(controller.signal);
    });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (confirmSlug) confirmRef.current?.focus();
  }, [confirmSlug]);

  const visible = categories?.filter(row =>
    (filter === "all" || (filter === "active" ? row.active : !row.active))
    && row.name.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))
  ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi")) ?? [];
  const confirming = categories?.find(row => row.slug === confirmSlug && row.active);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || loading) return;
    const normalized = name.normalize("NFC").trim().replace(/\s+/gu, " ");
    if (!normalized || normalized.length > 100) {
      setNameError("Tên phải có từ 1 đến 100 ký tự.");
      return;
    }
    setBusy(true);
    setNameError("");
    setMessage("");
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalized }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409) {
          const updated = await refresh();
          setNameError(responseError(body, `Tên này đã tồn tại. ${updated ? "Kiểm tra mục Đã xóa để khôi phục bản ghi cũ." : "Tải lại danh sách và kiểm tra mục Đã xóa để khôi phục."}`));
        } else if (response.status === 401 || response.status === 403) {
          setError("Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại rồi thử tiếp.");
        } else {
          setNameError(responseError(body, `Không thể thêm ${itemLabel}. Vui lòng thử lại.`));
        }
        return;
      }
      setName("");
      addDialogRef.current?.close();
      addTriggerRef.current?.focus();
      const updated = await refresh();
      if (updated) setMessage(`Đã thêm ${itemLabel} “${normalized}”.`);
      else setError(`Đã thêm ${itemLabel} nhưng chưa tải lại được danh sách. Hãy thử tải lại.`);
    } catch {
      setError(`Không thể thêm ${itemLabel}. Kiểm tra kết nối rồi thử lại.`);
    } finally {
      setBusy(false);
    }
  }

  async function changeActive(row: Category, active: boolean) {
    if (busy || loading || row.active === active) return;
    setBusy(true);
    setConfirmSlug(null);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(row.slug)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, expectedActive: row.active }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (response.status === 409) {
        const updated = await refresh();
        setError(updated
          ? `Trạng thái của “${row.name}” đã thay đổi ở nơi khác. Đã tải danh sách mới; vui lòng kiểm tra rồi thử lại.`
          : `Trạng thái của “${row.name}” đã thay đổi ở nơi khác. Không thể tải danh sách mới; hãy thử tải lại.`);
        return;
      }
      if (!response.ok) {
        setError(response.status === 401 || response.status === 403
          ? "Phiên quản trị đã hết hạn. Vui lòng đăng nhập lại rồi thử tiếp."
          : responseError(body, `Không thể ${active ? "khôi phục" : "xóa"} “${row.name}”. Vui lòng thử lại.`));
        return;
      }
      const updated = await refresh();
      if (updated) setMessage(active ? `Đã khôi phục “${row.name}”.` : `Đã xóa “${row.name}”. Các mặt hàng cũ vẫn được giữ nguyên.`);
      else setError(`Thao tác đã thành công nhưng chưa tải lại được danh sách. Hãy thử tải lại.`);
    } catch {
      setError(`Không thể ${active ? "khôi phục" : "xóa"} “${row.name}”. Kiểm tra kết nối rồi thử lại.`);
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-6">
    <dialog ref={addDialogRef} aria-labelledby="category-add-title" onClose={() => { setNameError(""); addTriggerRef.current?.focus(); }} className="m-auto w-[min(92vw,32rem)] max-h-[85vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-0 text-neutral-950 shadow-xl backdrop:bg-neutral-950/60">
    <form onSubmit={add} className="grid gap-3 p-5 sm:p-7">
      <h3 id="category-add-title" className="text-lg font-semibold">Thêm {itemLabel}</h3>
      <label htmlFor="category-name" className="text-sm font-medium">Tên {itemLabel}</label>
      <input id="category-name" name="name" type="text" value={name} maxLength={100} required disabled={busy || loading} onChange={event => { setName(event.target.value); setNameError(""); }} aria-invalid={!!nameError} aria-describedby={nameError ? "category-name-error" : "category-name-help"} className="min-w-0 rounded border border-neutral-300 px-3 py-2 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 disabled:opacity-60" />
      <p id="category-name-help" className="text-sm text-neutral-600">Tên dài tối đa 100 ký tự; nếu tên đã tồn tại trong mục Đã xóa, hãy khôi phục thay vì thêm mới.</p>
      {nameError && <p id="category-name-error" role="alert" className="text-sm text-red-700">{nameError}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={busy} onClick={() => addDialogRef.current?.close()} className="rounded border border-neutral-300 px-4 py-2 disabled:opacity-50">Hủy</button>
        <button type="submit" disabled={busy || loading} className="rounded bg-neutral-900 px-5 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang xử lý…" : `Lưu ${itemLabel}`}</button>
      </div>
    </form>
    </dialog>

    <section aria-label={`Danh sách ${itemLabel}`} className="grid gap-4 rounded border border-neutral-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-1"><label htmlFor="category-search" className="text-sm font-medium">Tìm theo tên</label><input id="category-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setConfirmSlug(null); }} className="rounded border border-neutral-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2" /></div>
        <div className="grid gap-1"><label htmlFor="category-filter" className="text-sm font-medium">Trạng thái</label><select id="category-filter" value={filter} onChange={event => { setFilter(event.target.value as Filter); setConfirmSlug(null); }} className="rounded border border-neutral-300 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2"><option value="all">Tất cả</option><option value="active">Đang dùng</option><option value="inactive">Đã xóa</option></select></div>
        <button type="button" onClick={() => { setMessage(""); void refresh(); }} disabled={busy || loading} className="rounded border border-neutral-300 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Tải lại danh sách</button>
        <button ref={addTriggerRef} type="button" disabled={busy || loading} onClick={() => { setNameError(""); setError(""); addDialogRef.current?.showModal(); }} className="rounded bg-neutral-900 px-5 py-2 font-semibold text-white disabled:opacity-50">Thêm {itemLabel}</button>
      </div>
      {message && <p role="status" className="text-sm text-green-800">{message}</p>}
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <p role="status" className="text-sm text-neutral-600">Đang tải danh sách…</p> : categories && (visible.length
        ? <><p className="text-sm text-neutral-600">Hiển thị {visible.length} / {categories.length} {itemLabel}.</p><ul className="divide-y divide-neutral-200">{visible.map(row => <li key={row.slug} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0"><p className="break-words font-semibold">{row.name}</p><p className="text-sm text-neutral-600">{row.active ? "Đang dùng" : "Đã xóa"} · {row.itemCount} mặt hàng tham chiếu</p></div>
          <div>{row.active ? <button type="button" disabled={busy} onClick={() => setConfirmSlug(row.slug)} aria-label={`Xóa ${itemLabel} ${row.name}`} className="rounded border border-red-300 px-4 py-2 text-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Xóa</button>
            : <button type="button" disabled={busy} onClick={() => void changeActive(row, true)} aria-label={`Khôi phục ${itemLabel} ${row.name}`} className="rounded border border-neutral-300 px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Khôi phục</button>}</div>
          {confirming?.slug === row.slug && <div role="group" aria-label={`Xác nhận xóa ${itemLabel} ${row.name}`} onKeyDown={event => { if (event.key === "Escape") setConfirmSlug(null); }} className="grid gap-3 rounded border border-amber-300 bg-amber-50 p-4 sm:col-span-2">
            <p className="font-semibold">Xóa “{row.name}” khỏi lựa chọn mới?</p>
            <p className="text-sm">Có {row.itemCount} mặt hàng tham chiếu. Đây là xóa mềm: không mặt hàng nào bị xóa, nhãn cũ và liên kết của chúng vẫn được giữ. Bạn có thể khôi phục {itemLabel} này sau.</p>
            <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void changeActive(row, false)} className="rounded bg-red-800 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Xác nhận xóa “{row.name}”</button><button ref={confirmRef} type="button" disabled={busy} onClick={() => setConfirmSlug(null)} className="rounded border border-neutral-300 bg-white px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2">Hủy xóa</button></div>
          </div>}
        </li>)}</ul></>
        : <p className="text-sm text-neutral-600">Không tìm thấy {itemLabel} phù hợp với bộ lọc.</p>)}
    </section>
  </div>;
}
