import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/auth/session";

export default async function BrandsSettingsPage() {
  await requireAdmin();
  return <section aria-labelledby="brands-settings-heading" className="max-w-4xl">
    <h2 id="brands-settings-heading" className="mb-2 text-xl font-bold">Nhãn hiệu</h2>
    <p className="mb-6 text-sm text-neutral-600">Thêm, xóa mềm hoặc khôi phục nhãn hiệu. Nhãn hiệu đã xóa không còn trong lựa chọn mới; các mặt hàng hiện có và tên nhãn hiệu cũ vẫn được giữ.</p>
    <CategoryManager endpoint="/api/admin/settings/brands" itemLabel="nhãn hiệu" />
  </section>;
}
