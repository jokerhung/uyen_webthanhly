import type { TimelineEntry } from "@/types/content";
import type { PublicShop } from "@/lib/shop/public";
export const timeline: readonly TimelineEntry[] = [];
export function aboutParagraphs(shop: PublicShop) {
  return [
    `${shop.shopName} là nơi những món đồ đã được yêu thích có cơ hội gặp gỡ một người chủ mới.`,
    "Chúng mình kết nối những người muốn thanh lý, ký gửi với những người đang tìm kiếm một món đồ phù hợp. Mỗi lần trao tay là một lần kéo dài hành trình của thời trang.",
    `Ghé ${shop.shopName} tại ${shop.address} hoặc liên hệ fanpage để trao đổi về món đồ của bạn.`,
  ];
}
