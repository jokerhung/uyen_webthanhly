import type { BranchGroup } from "@/types/content";
import { brand } from "./brand";
export const branchGroups: readonly BranchGroup[] = [{
  name: brand.name,
  description: "Thanh lý • Ký gửi • Thời trang được yêu thêm lần nữa",
  branches: [{ id: "phan-van-tri", address: brand.address, directionsStatus: "unverified" }],
}];
export const openingHours = "09:00–22:00";
