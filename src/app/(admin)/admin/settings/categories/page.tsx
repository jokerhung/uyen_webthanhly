import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/auth/session";

export default async function CategoriesSettingsPage() {
  await requireAdmin();
  return <section aria-labelledby="categories-settings-heading" className="max-w-4xl">
    <h2 id="categories-settings-heading" className="mb-2 text-xl font-bold">Loại sản phẩm</h2>
    <p className="mb-6 text-sm text-neutral-600">Thêm, xóa mềm hoặc khôi phục loại sản phẩm. Loại đã xóa không còn trong lựa chọn mới; các mặt hàng hiện có và tên loại cũ vẫn được giữ.</p>
    <CategoryManager />
  </section>;
}
