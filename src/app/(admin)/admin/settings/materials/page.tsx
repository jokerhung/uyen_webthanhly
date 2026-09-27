import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/auth/session";

export default async function MaterialsSettingsPage() {
  await requireAdmin();
  return <section aria-labelledby="materials-settings-heading" className="max-w-4xl">
    <h2 id="materials-settings-heading" className="mb-2 text-xl font-bold">Chất liệu</h2>
    <p className="mb-6 text-sm text-neutral-600">Thêm, xóa mềm hoặc khôi phục chất liệu. Chất liệu đã xóa không còn trong lựa chọn mới; các mặt hàng hiện có và tên chất liệu cũ vẫn được giữ.</p>
    <CategoryManager endpoint="/api/admin/settings/materials" itemLabel="chất liệu" />
  </section>;
}
