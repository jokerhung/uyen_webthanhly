import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/auth/session";

export default async function SizesSettingsPage() {
  await requireAdmin();
  return <section aria-labelledby="sizes-settings-heading" className="max-w-4xl">
    <h2 id="sizes-settings-heading" className="mb-2 text-xl font-bold">Kích thước</h2>
    <p className="mb-6 text-sm text-neutral-600">Thêm kích thước dạng chữ hoặc số, xóa mềm hoặc khôi phục. Kích thước đã xóa không còn trong lựa chọn mới; các mặt hàng hiện có và tên kích thước cũ vẫn được giữ.</p>
    <CategoryManager endpoint="/api/admin/settings/sizes" itemLabel="kích thước" />
  </section>;
}
