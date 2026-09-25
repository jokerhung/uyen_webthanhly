"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

type Group = { key: string; label: string; options: { id: string; label: string }[] };
export function CatalogFilters({ children, groups, selected, total }: { children: ReactNode; groups: Group[]; selected: Record<string, string>; total: number }) {
  const [open, setOpen] = useState(true);
  return <div className={`catalog-shop ${open ? "catalog-shop--filtered" : ""}`}>
    <header className="catalog-shop__toolbar"><div><h1>Hàng đang bán</h1><span>{total} sản phẩm</span></div><button type="button" aria-expanded={open} aria-controls="catalog-filters" onClick={() => setOpen(value => !value)}>{open ? "Ẩn bộ lọc −" : "Bộ lọc +"}</button></header>
    <div className="catalog-shop__body"><div className="catalog-shop__results">{children}</div>
      {open && <aside id="catalog-filters" className="catalog-filters" aria-label="Bộ lọc sản phẩm">
        <button type="button" className="catalog-filters__close" aria-label="Đóng bộ lọc" onClick={() => setOpen(false)}>×</button>
        <form action="/items" method="get" key={JSON.stringify(selected)}>
          <div className="catalog-filters__fields">
          <fieldset className="catalog-filter"><legend>01 | Sắp xếp</legend><div className="catalog-filter__choices">{[["new", "Mới nhất"], ["price-asc", "Giá tăng dần"], ["price-desc", "Giá giảm dần"]].map(([value, label]) => <label key={value}><input type="radio" name="sort" value={value} defaultChecked={(selected.sort || "new") === value} /><span>{label}</span></label>)}</div></fieldset>
          {groups.map((group, index) => <fieldset className="catalog-filter" key={group.key}><legend>{String(index + 2).padStart(2, "0")} | {group.label}</legend><div className="catalog-filter__choices"><label><input type="radio" name={group.key} value="" defaultChecked={!selected[group.key]} /><span>Tất cả</span></label>{group.options.map(option => <label key={option.id}><input type="radio" name={group.key} value={option.id} defaultChecked={selected[group.key] === option.id} /><span>{option.label}</span></label>)}</div></fieldset>)}
          <fieldset className="catalog-filter"><legend>08 | Giá (VNĐ)</legend><div className="catalog-filter__prices"><label>Từ<input name="minPrice" type="number" min="0" step="1000" defaultValue={selected.minPrice} placeholder="0" /></label><label>Đến<input name="maxPrice" type="number" min="0" step="1000" defaultValue={selected.maxPrice} placeholder="Không giới hạn" /></label></div></fieldset>
          </div><div className="catalog-filters__footer"><button type="submit">Xem kết quả</button><Link href="/items">Xóa bộ lọc</Link></div>
        </form>
      </aside>}
    </div>
  </div>;
}
