import type { ChangeEvent } from "react";

type Props = {
  id: string;
  files: File[];
  onChange: (files: File[]) => void;
  disabled: boolean;
  error?: string;
  maxImagesPerItem: number | null;
  maxImageBytes: number | null;
};

export function ImageUpload({ id, files, onChange, disabled, error, maxImagesPerItem, maxImageBytes }: Props) {
  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    onChange([...files, ...Array.from(event.target.files ?? [])]);
    // Allow choosing the same file after removing it from the current selection.
    event.target.value = "";
  }

  return <div className="consignment-field">
    <label htmlFor={id}>Ảnh mặt hàng</label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} onChange={selectFiles} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} aria-invalid={Boolean(error)} />
    <p id={`${id}-hint`} className="consignment-hint">Chọn ảnh JPG, PNG hoặc WebP. {maxImagesPerItem ? `Tối đa ${maxImagesPerItem} ảnh/món. ` : ""}{maxImageBytes ? `Mỗi ảnh tối đa ${Math.floor(maxImageBytes / 1024 / 1024)} MB.` : "Giới hạn ảnh sẽ được kiểm tra khi gửi."}</p>
    {files.length > 0 && <ul className="consignment-file-list">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}>
      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
      <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Xóa ảnh ${file.name}`}>Xóa</button>
    </li>)}</ul>}
    {error && <p id={`${id}-error`} className="consignment-error" role="alert">{error}</p>}
  </div>;
}
