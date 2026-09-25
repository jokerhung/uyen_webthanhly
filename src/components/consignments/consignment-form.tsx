"use client";

import { useRef, useState, type FormEvent } from "react";
import { ItemFields, type ConsignmentItemDraft, type ItemFieldErrors, type ItemFieldName } from "./item-fields";
import type { ItemCategoryOption } from "@/types/category";
import type { IntakeKind } from "@/types/intake";
import "./consignment-form.css";

const newItem = (id = crypto.randomUUID()): ConsignmentItemDraft => ({ id, name: "", category: "", description: "", condition: "", desiredPrice: "", images: [] });
const newRequestKey = () => crypto.randomUUID();
type FormErrors = { name?: string; phone?: string; consent?: string; items?: string; itemErrors?: Record<string, ItemFieldErrors> };
type Props = { intakeType: IntakeKind; minimumItems: number | null; maxImagesPerItem: number | null; maxImageBytes: number | null; privacyPolicyReviewed: boolean; categories: readonly ItemCategoryOption[] };

export function ConsignmentForm({ intakeType, minimumItems, maxImagesPerItem, maxImageBytes, privacyPolicyReviewed, categories }: Props) {
  const isBuy = intakeType === "buy";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  // The initial field IDs must match between server render and hydration.
  const [items, setItems] = useState<ConsignmentItemDraft[]>(() => [newItem("initial")]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submissionError, setSubmissionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [publicCode, setPublicCode] = useState("");
  const requestKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  function markChanged() {
    // An edited payload is a new request; unedited retries reuse their old key.
    requestKey.current = null;
    setSubmissionError("");
    setErrors({});
  }

  function changeItem(id: string, field: Exclude<ItemFieldName, "images">, value: string) {
    markChanged();
    setItems((previous) => previous.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function validate(): FormErrors {
    const next: FormErrors = { itemErrors: {} };
    if (!name.trim()) next.name = "Vui lòng nhập họ tên.";
    if (!/^(?:0\d{9,10}|\+84\d{9,10})$/.test(phone.replace(/[\s.-]/g, ""))) next.phone = "Vui lòng nhập số điện thoại Việt Nam hợp lệ.";
    if (!consent) next.consent = "Vui lòng xác nhận đã đọc thông báo trước khi gửi.";
    if (minimumItems && items.length < minimumItems) next.items = `Vui lòng thêm ít nhất ${minimumItems} mặt hàng.`;
    items.forEach((item) => {
      const itemError: ItemFieldErrors = {};
      if (!item.name.trim()) itemError.name = "Vui lòng nhập tên mặt hàng.";
      if (!categories.some((category) => category.slug === item.category)) itemError.category = "Vui lòng chọn loại mặt hàng hợp lệ.";
      if (!item.description.trim()) itemError.description = "Vui lòng nhập mô tả.";
      if (!item.condition.trim()) itemError.condition = "Vui lòng nhập tình trạng.";
      if (!/^\d+$/.test(item.desiredPrice.trim()) || !Number.isSafeInteger(Number(item.desiredPrice)) || Number(item.desiredPrice) <= 0) itemError.desiredPrice = "Giá mong muốn phải là số nguyên lớn hơn 0.";
      if (!item.images.length) itemError.images = "Vui lòng chọn ít nhất một ảnh.";
      else if (maxImagesPerItem && item.images.length > maxImagesPerItem) itemError.images = `Chọn tối đa ${maxImagesPerItem} ảnh cho một mặt hàng.`;
      else if (maxImageBytes && item.images.some((image) => image.size > maxImageBytes)) itemError.images = "Có ảnh vượt quá dung lượng cho phép.";
      else if (item.images.some((image) => !["image/jpeg", "image/png", "image/webp"].includes(image.type))) itemError.images = "Chỉ chọn ảnh JPG, PNG hoặc WebP.";
      if (Object.keys(itemError).length) next.itemErrors![item.id] = itemError;
    });
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !privacyPolicyReviewed || categories.length === 0) return;
    const fieldErrors = validate();
    if (fieldErrors.name || fieldErrors.phone || fieldErrors.consent || fieldErrors.items || Object.keys(fieldErrors.itemErrors ?? {}).length) {
      setErrors(fieldErrors);
      setSubmissionError("Vui lòng kiểm tra lại các trường được đánh dấu.");
      return;
    }
    setErrors({});
    setSubmissionError("");
    inFlight.current = true;
    setSubmitting(true);
    requestKey.current ??= newRequestKey();
    const payload = new FormData();
    payload.set("name", name.trim());
    payload.set("phone", phone.trim());
    payload.set("consent", "true");
    payload.set("intakeType", intakeType);
    payload.set("items", JSON.stringify(items.map(({ name: itemName, category, description, condition, desiredPrice }) => ({ name: itemName.trim(), category: category.trim(), description: description.trim(), condition: condition.trim(), desiredPrice: Number(desiredPrice) }))));
    items.forEach((item, index) => item.images.forEach((image) => payload.append(`images.${index}`, image)));
    try {
      const response = await fetch("/api/consignments", { method: "POST", body: payload, headers: { "Idempotency-Key": requestKey.current } });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 429) throw new Error("Bạn gửi quá nhiều lần. Vui lòng thử lại sau.");
        if (response.status === 413) throw new Error("Dung lượng ảnh vượt giới hạn. Vui lòng chọn ảnh nhỏ hơn.");
        if (response.status === 400 || response.status === 422) throw new Error("Thông tin hoặc ảnh không hợp lệ. Vui lòng kiểm tra và chỉnh sửa trước khi gửi lại.");
        throw new Error("Chưa thể gửi phiếu. Bạn có thể thử lại; hệ thống sẽ không tạo phiếu trùng nếu yêu cầu trước đã được lưu.");
      }
      if (!body || typeof body !== "object" || !("public_code" in body) || typeof body.public_code !== "string" || !body.public_code) throw new Error("Không nhận được mã phiếu. Vui lòng thử lại với cùng nội dung để kiểm tra kết quả.");
      setPublicCode(body.public_code);
      requestKey.current = null;
      setName(""); setPhone(""); setConsent(false); setItems([newItem()]);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Không thể gửi phiếu. Vui lòng thử lại.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (publicCode) return <div className="consignment-success" role="status">
    <h2>Đã nhận phiếu {isBuy ? "thu mua" : "ký gửi"}</h2>
    <p>Mã phiếu của bạn: <strong className="consignment-code">{publicCode}</strong></p>
    <p>{isBuy ? "Yêu cầu thu mua đang chờ shop kiểm tra và báo giá; gửi phiếu không có nghĩa shop đã đồng ý thu mua hay thanh toán." : "Các mặt hàng đang chờ quản trị viên duyệt và chưa xuất hiện trong danh sách hàng bán."} Vui lòng lưu lại mã phiếu để liên hệ khi cần.</p>
    <button type="button" className="consignment-button" onClick={() => { setPublicCode(""); requestKey.current = null; }}>Gửi phiếu khác</button>
  </div>;

  return <form className="consignment-form" onSubmit={submit} noValidate>
    <section aria-labelledby="consignment-contact"><h2 id="consignment-contact">Thông tin liên hệ</h2>
      <div className="consignment-grid">
        <div className="consignment-field"><label htmlFor="consignment-name">Họ và tên <span aria-hidden="true">*</span></label><input id="consignment-name" autoComplete="name" value={name} disabled={submitting || !privacyPolicyReviewed} required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "consignment-name-error" : undefined} onChange={(event) => { markChanged(); setName(event.target.value); }} />{errors.name && <p id="consignment-name-error" role="alert" className="consignment-error">{errors.name}</p>}</div>
        <div className="consignment-field"><label htmlFor="consignment-phone">Số điện thoại <span aria-hidden="true">*</span></label><input id="consignment-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} disabled={submitting || !privacyPolicyReviewed} required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "consignment-phone-error" : undefined} onChange={(event) => { markChanged(); setPhone(event.target.value); }} />{errors.phone && <p id="consignment-phone-error" role="alert" className="consignment-error">{errors.phone}</p>}</div>
      </div>
    </section>
    <section aria-labelledby="consignment-items"><h2 id="consignment-items">Mặt hàng {isBuy ? "thu mua" : "ký gửi"}</h2>
      {categories.length === 0 && <p className="consignment-unavailable" role="status">Chưa có loại mặt hàng đang nhận. Vui lòng quay lại sau.</p>}
      <p className="consignment-hint">Thêm từng mặt hàng và ảnh tương ứng. {isBuy ? "Giá mong muốn chỉ để tham khảo; shop sẽ kiểm tra và báo giá thu mua, chưa có thỏa thuận thanh toán." : "Giá mong muốn không phải giá bán công khai; shop sẽ xác nhận giá khi duyệt."}{minimumItems ? ` Yêu cầu tối thiểu ${minimumItems} mặt hàng.` : ""}</p>
      {items.map((item, index) => <ItemFields key={item.id} item={item} index={index} disabled={submitting || !privacyPolicyReviewed} canRemove={items.length > 1} errors={errors.itemErrors?.[item.id] ?? {}} maxImagesPerItem={maxImagesPerItem} maxImageBytes={maxImageBytes} categories={categories} onChange={(field, value) => changeItem(item.id, field, value)} onImagesChange={(images) => { markChanged(); setItems((previous) => previous.map((current) => current.id === item.id ? { ...current, images } : current)); }} onRemove={() => { markChanged(); setItems((previous) => previous.filter((current) => current.id !== item.id)); }} />)}
      {errors.items && <p className="consignment-error" role="alert">{errors.items}</p>}
      <button type="button" className="consignment-button consignment-button--secondary" disabled={submitting || !privacyPolicyReviewed} onClick={() => { markChanged(); setItems((previous) => [...previous, newItem()]); }}>+ Thêm mặt hàng</button>
    </section>
    {!privacyPolicyReviewed && <p className="consignment-unavailable" role="status">Tạm chưa tiếp nhận phiếu {isBuy ? "thu mua" : "ký gửi"} online vì chính sách xử lý, lưu giữ và xóa thông tin cá nhân chưa được phê duyệt. Vui lòng không nhập hoặc gửi thông tin cá nhân tại đây cho đến khi có thông báo chính thức.</p>}
    <div className="consignment-notice"><h2>Thông báo về thông tin bạn gửi</h2><p>Họ tên, số điện thoại và ảnh mặt hàng được gửi đến hệ thống để tiếp nhận phiếu và quản trị viên xem xét. {privacyPolicyReviewed ? "Vui lòng đọc kỹ thông báo và cân nhắc trước khi cung cấp thông tin." : "Chính sách chi tiết về thời hạn lưu giữ, xóa dữ liệu và liên hệ xử lý vẫn đang chờ phê duyệt; hiện không tiếp nhận thông tin cá nhân qua biểu mẫu này."} Không tải lên ảnh chứa giấy tờ tùy thân hoặc thông tin nhạy cảm.</p>
      <label className="consignment-check" htmlFor="consignment-consent"><input id="consignment-consent" type="checkbox" checked={consent} disabled={submitting || !privacyPolicyReviewed} onChange={(event) => { markChanged(); setConsent(event.target.checked); }} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consignment-consent-error" : undefined} /><span>Tôi đã đọc thông báo trên và đồng ý gửi thông tin liên hệ, ảnh mặt hàng để xử lý yêu cầu {isBuy ? "thu mua" : "ký gửi"}.{!privacyPolicyReviewed && <> <strong>Chính sách dữ liệu chưa được phê duyệt; hiện không thể gửi phiếu.</strong></>}</span></label>
      {errors.consent && <p id="consignment-consent-error" role="alert" className="consignment-error">{errors.consent}</p>}
    </div>
    <div className="consignment-actions"><button className="consignment-button" type="submit" disabled={submitting || !privacyPolicyReviewed || categories.length === 0}>{submitting ? "Đang gửi phiếu…" : privacyPolicyReviewed ? `Gửi phiếu ${isBuy ? "thu mua" : "ký gửi"}` : "Tạm ngừng tiếp nhận online"}</button><p aria-live="polite" role="status">{submissionError || (submitting ? "Đang gửi dữ liệu, vui lòng không đóng trang." : "")}</p></div>
  </form>;
}
