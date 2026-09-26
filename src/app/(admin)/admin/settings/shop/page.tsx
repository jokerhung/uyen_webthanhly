import { ShopSettingsForm } from "@/components/admin/shop-settings-form";
import { requireAdmin } from "@/lib/auth/session";
import { getShopSettings } from "@/lib/shop/settings";

export default async function ShopSettingsPage() {
  await requireAdmin();
  const settings = await getShopSettings();
  return <section aria-labelledby="shop-settings-heading" className="max-w-4xl">
    <h2 id="shop-settings-heading" className="mb-2 text-xl font-bold">Thông tin shop</h2>
    <p className="mb-6 text-sm text-neutral-600">Thông tin liên hệ, giờ hoạt động và màu sắc hiển thị của cửa hàng.</p>
    <ShopSettingsForm initialSettings={settings} />
  </section>;
}
