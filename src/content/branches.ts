import type { BranchGroup } from "@/types/content";
import type { PublicShop } from "@/lib/shop/public";
export function branchGroups(shop: PublicShop): readonly BranchGroup[] {
  return [{ name: shop.shopName, description: "Thanh lý • Ký gửi • Thời trang được yêu thêm lần nữa", branches: [{ id: "shop", address: shop.address, directionsStatus: "unverified" }] }];
}
export function openingHours(shop: PublicShop) {
  return `${shop.opensAt}–${shop.closesAt}${shop.closesAt < shop.opensAt ? " (ngày hôm sau)" : ""}`;
}
