import "server-only";
import { getShopSettings, type ShopSettings } from "./settings";

export type PublicShop = Pick<ShopSettings, "shopName" | "slogan" | "announcementText" | "announcementEnabled" | "primaryColor" | "backgroundColor" | "surfaceColor" | "address" | "facebookUrl" | "phone" | "opensAt" | "closesAt">;
export async function getPublicShop(): Promise<PublicShop> {
  const { shopName, slogan, announcementText, announcementEnabled, primaryColor, backgroundColor, surfaceColor, address, facebookUrl, phone, opensAt, closesAt } = await getShopSettings();
  return { shopName, slogan, announcementText, announcementEnabled, primaryColor, backgroundColor, surfaceColor, address, facebookUrl, phone, opensAt, closesAt };
}
export const shopOpeningHours = (shop: PublicShop) => `${shop.opensAt}–${shop.closesAt}${shop.closesAt < shop.opensAt ? " (ngày hôm sau)" : ""}`;
export const shopDescription = (shop: PublicShop) => `${shop.shopName} là nơi những món đồ đã được yêu thích có cơ hội gặp gỡ một người chủ mới. Chúng mình kết nối những người muốn thanh lý, ký gửi với những người đang tìm kiếm một món đồ phù hợp. Ghé ${shop.shopName} tại ${shop.address} hoặc liên hệ fanpage để trao đổi về món đồ của bạn.`;
export const shopZaloUrl = (shop: PublicShop) => `https://zalo.me/${shop.phone}`;
