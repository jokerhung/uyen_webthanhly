import { AnnouncementSettingsForm } from "@/components/admin/announcement-settings-form";
import { requireAdmin } from "@/lib/auth/session";
import { getShopSettings } from "@/lib/shop/settings";

export default async function AnnouncementSettingsPage() {
  await requireAdmin();
  const settings = await getShopSettings();
  return <section aria-labelledby="announcement-settings-heading" className="max-w-4xl">
    <h2 id="announcement-settings-heading" className="mb-2 text-xl font-bold">Chữ chạy trang chủ</h2>
    <p className="mb-6 text-sm text-neutral-600">Thay đổi nội dung thông báo trên trang chủ và các trang công khai cùng sử dụng thanh chữ chạy.</p>
    <AnnouncementSettingsForm initialSettings={settings} />
  </section>;
}
