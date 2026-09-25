import { ImageUpload } from "./image-upload";
import type { ItemCategoryOption } from "@/types/category";

export type ConsignmentItemDraft = {
  id: string;
  name: string;
  category: string;
  description: string;
  condition: string;
  desiredPrice: string;
  images: File[];
};

export type ItemFieldName = "name" | "category" | "description" | "condition" | "desiredPrice" | "images";
export type ItemFieldErrors = Partial<Record<ItemFieldName, string>>;

type Props = {
  item: ConsignmentItemDraft;
  index: number;
  errors: ItemFieldErrors;
  disabled: boolean;
  canRemove: boolean;
  onChange: (field: Exclude<ItemFieldName, "images">, value: string) => void;
  onImagesChange: (images: File[]) => void;
  onRemove: () => void;
  maxImagesPerItem: number | null;
  maxImageBytes: number | null;
  categories: readonly ItemCategoryOption[];
};

export function ItemFields({ item, index, errors, disabled, canRemove, onChange, onImagesChange, onRemove, maxImagesPerItem, maxImageBytes, categories }: Props) {
  const prefix = `item-${item.id}`;
  const input = (field: Exclude<ItemFieldName, "images">, title: string, type = "text") => {
    const id = `${prefix}-${field}`;
    return <div className="consignment-field" key={field}>
      <label htmlFor={id}>{title} <span aria-hidden="true">*</span></label>
      <input id={id} type={type} value={item[field]} onChange={(event) => onChange(field, event.target.value)} disabled={disabled} required aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${id}-error` : undefined} min={type === "number" ? "1" : undefined} step={type === "number" ? "1" : undefined} inputMode={type === "number" ? "numeric" : undefined} />
      {errors[field] && <p id={`${id}-error`} className="consignment-error" role="alert">{errors[field]}</p>}
    </div>;
  };

  return <fieldset className="consignment-item">
    <legend>Mặt hàng {index + 1}</legend>
    {canRemove && <button className="consignment-remove" type="button" disabled={disabled} onClick={onRemove} aria-label={`Xóa mặt hàng ${index + 1}`}>Xóa mặt hàng</button>}
    <div className="consignment-grid">
      {input("name", "Tên mặt hàng")}
      <div className="consignment-field">
        <label htmlFor={`${prefix}-category`}>Loại mặt hàng <span aria-hidden="true">*</span></label>
        <select id={`${prefix}-category`} value={item.category} onChange={(event) => onChange("category", event.target.value)} disabled={disabled || categories.length === 0} required aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? `${prefix}-category-error` : undefined}>
          <option value="">Chọn loại mặt hàng</option>
          {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
        </select>
        {errors.category && <p id={`${prefix}-category-error`} className="consignment-error" role="alert">{errors.category}</p>}
      </div>
    </div>
    <div className="consignment-field">
      <label htmlFor={`${prefix}-description`}>Mô tả <span aria-hidden="true">*</span></label>
      <textarea id={`${prefix}-description`} rows={4} value={item.description} onChange={(event) => onChange("description", event.target.value)} disabled={disabled} required aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${prefix}-description-error` : undefined} />
      {errors.description && <p id={`${prefix}-description-error`} className="consignment-error" role="alert">{errors.description}</p>}
    </div>
    <div className="consignment-grid">
      {input("condition", "Tình trạng")}
      {input("desiredPrice", "Giá mong muốn (VNĐ)", "number")}
    </div>
    <ImageUpload id={`${prefix}-images`} files={item.images} onChange={onImagesChange} disabled={disabled} error={errors.images} maxImagesPerItem={maxImagesPerItem} maxImageBytes={maxImageBytes} />
  </fieldset>;
}
