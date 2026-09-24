import type { TimelineEntry } from "@/types/content";

export const aboutParagraphs = [
  "Chúng mình chọn dịch vụ thanh lý – ký gửi với mong muốn cùng bạn nỗ lực xây dựng thời trang bền vững. Một hình thức bạn mang quần áo không sử dụng tới bên trung gian để thanh lý cho người cần.",
  "Nếu bạn yêu môi trường nhưng chưa thể cắt giảm ngay nhu cầu của mình thì hãy cùng H.U.N bắt đầu bằng việc tái sử dụng nhé!",
  "H.U.N sẵn lòng là cầu nối để giúp bạn tìm được thứ bạn cần, quần áo lại được tái vòng đời yêu thương.",
] as const;

export const timeline: readonly TimelineEntry[] = [
  { year: "2021", label: "Mở rộng quy mô" },
  { year: "2022", label: "Tối ưu quy trình" },
  { year: "2024", label: "Tách biệt phân khúc" },
  { year: "2026", label: "Phát triển bền vững", current: true },
];

export const announcement = 'THÔNG BÁO: "H.U.N PREMIUM DỰ KIẾN SẼ CHUYỂN MẶT BẰNG VÀO THÁNG 09"';
