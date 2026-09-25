import type { TimelineEntry } from "@/types/content";
import { brand } from "./brand";
export const aboutParagraphs = [
  "Besties Club là nơi những món đồ đã được yêu thích có cơ hội gặp gỡ một người chủ mới.",
  "Chúng mình kết nối những người muốn thanh lý, ký gửi với những người đang tìm kiếm một món đồ phù hợp. Mỗi lần trao tay là một lần kéo dài hành trình của thời trang.",
  "Ghé Besties Club tại 12 Phan Văn Trị, Ô Chợ Dừa, Hà Nội hoặc liên hệ fanpage để trao đổi về món đồ của bạn.",
] as const;
export const timeline: readonly TimelineEntry[] = [];
export const announcement = `${brand.fullName} ✦ ${brand.address} ✦ ${brand.phone}`;
