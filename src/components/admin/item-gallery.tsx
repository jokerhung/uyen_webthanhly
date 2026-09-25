"use client";

import Image from "next/image";
import { useState } from "react";

export function ItemGallery({ images, name }: { images: { storageKey: string; altText: string }[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];
  if (!current) return <div className="item-gallery__empty">Chưa có ảnh mặt hàng</div>;
  return <div className="item-gallery">
    <div className="item-gallery__thumbnails" aria-label="Chọn ảnh mặt hàng">
      {images.map((image, index) => <button key={image.storageKey} type="button" aria-label={`Xem ảnh ${index + 1} của ${name}`} aria-pressed={index === selected} onClick={() => setSelected(index)} className={`item-gallery__thumbnail ${index === selected ? "is-selected" : ""}`}>
        <Image unoptimized src={`/api/admin/images/${encodeURIComponent(image.storageKey)}`} alt={image.altText || name} width={80} height={120} />
      </button>)}
    </div>
    <div className="item-gallery__main"><Image unoptimized src={`/api/admin/images/${encodeURIComponent(current.storageKey)}`} alt={current.altText || name} width={900} height={1200} priority /></div>
  </div>;
}
