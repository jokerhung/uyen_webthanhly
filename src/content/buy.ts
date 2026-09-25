import type { BuyPrice, CriteriaGroup, ServiceProcesses } from "@/types/services";
import { brand } from "./brand";
export const buyAnnouncement = ["Liên hệ Besties Club để xác nhận chương trình thu mua và mặt hàng đang tiếp nhận."] as const;
export const buyPrices: readonly BuyPrice[] = [{ name: "Báo giá mặt hàng", price: "Liên hệ shop" }];
export const buyCriteria: readonly CriteriaGroup[] = [{ title: "Trước khi gửi yêu cầu:", items: ["Chuẩn bị ảnh rõ và mô tả tình trạng thực tế.", "Shop xem xét từng mặt hàng và trao đổi điều kiện thu mua trực tiếp."] }];
export const buyProcesses: ServiceProcesses = {
 direct: { label: "Thu Mua Trực Tiếp", note: "Vui lòng liên hệ shop trước khi mang đồ tới.", steps: [
 { text: `Gọi ${brand.phone} hoặc nhắn fanpage để được tư vấn` },
 { text: `Mang đồ tới ${brand.address} theo lịch đã thống nhất` },
 { text: "Shop kiểm tra và trao đổi giá, phương thức thanh toán" }] },
 online: { label: "Thu Mua Online", steps: [
 { text: "Gửi ảnh và thông tin mặt hàng qua form yêu cầu thu mua" },
 { text: "Chờ shop liên hệ và trao đổi báo giá" },
 { text: "Thống nhất cách giao nhận và thanh toán với shop" }] },
};
