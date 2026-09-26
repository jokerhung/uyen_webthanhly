import type { FeeTier, ServiceProcesses } from "@/types/services";
import type { PublicShop } from "@/lib/shop/public";
export const consignFees: readonly FeeTier[] = [{ range: "Phí ký gửi", description: "Liên hệ shop để được tư vấn theo mặt hàng" }];
export const consignFeeExample = "Giá bán, phí ký gửi và thời điểm quyết toán được trao đổi với shop trước khi tiếp nhận.";
export const consignCriteria: readonly string[] = ["Cung cấp ảnh và mô tả đúng tình trạng mặt hàng.", "Shop kiểm tra thông tin và trao đổi điều kiện tiếp nhận.", "Liên hệ shop để được tư vấn trước khi mang hoặc gửi đồ."];
export function getConsignProcesses(shop: PublicShop): ServiceProcesses { return {
 direct: { label: "Ký Gửi Trực Tiếp", note: "Liên hệ shop trước khi ghé để được hướng dẫn.", steps: [
 { text: `Gọi ${shop.phone} hoặc nhắn fanpage ${shop.shopName}` },
 { text: `Mang đồ tới ${shop.address} theo lịch đã trao đổi` },
 { text: "Trao đổi giá bán, phí và điều kiện ký gửi với shop" },
 { text: "Theo dõi và nhận quyết toán theo thỏa thuận" }] },
 online: { label: "Ký Gửi Online", steps: [
 { text: "Gửi thông tin và ảnh mặt hàng qua form ký gửi trên website" },
 { text: "Shop xem xét và liên hệ trao đổi giá, điều kiện tiếp nhận" },
 { text: "Gửi hoặc mang đồ tới shop theo hướng dẫn đã thống nhất" },
 { text: "Mặt hàng được đăng bán sau khi shop xác nhận" },
 { text: "Nhận quyết toán theo thỏa thuận với shop" }] },
}; }
export const consignNotes = ["Vui lòng thống nhất điều kiện ký gửi và vận chuyển với shop trước khi gửi đồ."] as const;
