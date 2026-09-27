import { ShopSettingsForm } from "@/components/admin/shop-settings-form";
import { ShopLogoForm } from "@/components/admin/shop-logo-form";
import { requireAdmin } from "@/lib/auth/session";
import { getShopSettings } from "@/lib/shop/settings";

export default async function ShopSettingsPage({ searchParams }: { searchParams: Promise<{ logo?: string }> }) {
  await requireAdmin();
  const settings = await getShopSettings();
  const { logo } = await searchParams;
  const messages: Record<string, string> = { success: "Đã cập nhật favicon. Biểu tượng mới được dùng trên tab trình duyệt.", conflict: "Cấu hình đã thay đổi. Vui lòng chọn ảnh và upload lại.", session: "Phiên đăng nhập đã hết hạn.", origin: "Tên miền chưa được phép upload.", invalid: "Chọn ảnh JPG, PNG hoặc WebP hợp lệ, tối đa 5 MB.", error: "Không thể lưu logo. Vui lòng thử lại." };
  return <section aria-labelledby="shop-settings-heading" className="max-w-4xl">
    <h2 id="shop-settings-heading" className="mb-2 text-xl font-bold">Thông tin shop</h2>
    <p className="mb-6 text-sm text-neutral-600">Thông tin liên hệ, giờ hoạt động và màu sắc hiển thị của cửa hàng.</p>
    <ShopSettingsForm initialSettings={settings} />
    <div className="mt-6">
      {logo && messages[logo] && <p role="status" className="mb-3 text-sm">{messages[logo]}</p>}
      <ShopLogoForm logoKey={settings.logoKey} version={settings.version} shopName={settings.shopName} />
    </div>
  </section>;
}
