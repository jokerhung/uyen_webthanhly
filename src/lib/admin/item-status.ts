import { ItemStatus } from "@prisma/client";

export const activeItemStatuses = [ItemStatus.PENDING, ItemStatus.NEGOTIATING, ItemStatus.RECEIVED, ItemStatus.APPROVED, ItemStatus.SOLD, ItemStatus.SETTLED, ItemStatus.REJECTED, ItemStatus.DELETED] as const;
export const statusActionTargets = {
  intake: ItemStatus.PENDING,
  negotiate: ItemStatus.NEGOTIATING,
  receive: ItemStatus.RECEIVED,
  approve: ItemStatus.APPROVED,
  sold: ItemStatus.SOLD,
  settle: ItemStatus.SETTLED,
  reject: ItemStatus.REJECTED,
  delete: ItemStatus.DELETED,
} as const;
export type StatusAction = keyof typeof statusActionTargets;
export const itemStatusLabels: Record<ItemStatus, string> = {
  PENDING: "Vừa tiếp nhận",
  NEGOTIATING: "Đang đàm phán giá",
  RECEIVED: "Đã tiếp nhận",
  APPROVED: "Đang bán",
  SOLD: "Đã bán",
  SETTLED: "Đã quyết toán",
  REJECTED: "Từ chối",
  DELETED: "Đã xóa",
  HIDDEN: "Đã ẩn (trạng thái cũ)",
};
