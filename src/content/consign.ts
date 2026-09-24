import type { FeeTier, ServiceBranchGroup, ServiceProcesses } from "@/types/services";

/** Reference-site public copy captured 2026-09-23; fees and acceptance policy need shop approval. */
export const consignFees: readonly FeeTier[] = [
  { range: "Dưới 60k", description: "H.U.N nhận 20k / sản phẩm" },
  { range: "Từ 60k – 130k", description: "H.U.N nhận 30k / sản phẩm" },
  { range: "Trên 130k", description: "H.U.N nhận 25% / sản phẩm" },
  { range: "Không bán được", description: "Không mất phí", noFee: true },
];
export const consignFeeExample = "Ví dụ: Sản phẩm định giá 130k → bạn nhận 100k, H.U.N nhận 30k.";
export const consignCriteria: readonly string[] = [
  "H.U.N nhận từ 5 sản phẩm: Quần áo nữ, túi xách, giày dép, phụ kiện, nước hoa, mỹ phẩm...",
  "Quần áo độ mới cao trên 90%, trẻ trung và thanh lịch",
  "Nhận đồ hè (tháng 02–08), nhận đồ đông (tháng 09–01)",
  "Túi xách, giày dép cần được làm sạch, không bong tróc",
  "Phụ kiện trang sức nhận hàng có thương hiệu hoặc từ xưởng",
  "Hỗ trợ thanh lý xả kho cho các shop / xưởng",
];
export const consignProcesses: ServiceProcesses = {
  direct: {
    label: "Ký Gửi Trực Tiếp",
    note: "Khuyên dùng cho khách nội thành Hà Nội — trao đổi giá bán trực tiếp với nhân viên.",
    steps: [
      { text: "Gọi điện đến số hotline để được xếp lịch. Khung giờ trực hotline 10h–20h30" },
      { text: "Mang tới H.U.N, thoả thuận giá bán trực tiếp" },
      { text: "Xác nhận và đồ sẽ được treo bán 50–60 ngày" },
      { text: "Tra cứu trên website và nhận chuyển khoản khi đến hạn" },
    ],
  },
  online: {
    label: "Ký Gửi Online",
    steps: [
      { text: "Chụp ảnh túi đồ, gửi ảnh kèm SĐT qua kênh Zalo chính thức của H.U.N - ", link: { label: "Nhấn tại đây", href: "https://zalo.me/hunthanhly" } },
      { text: 'Dán thông tin "Tên + SĐT" lên túi, ship trong khung giờ 10h–20h30' },
      { text: "Nhận báo giá qua Zalo trong 10–15 ngày" },
      { text: "Xác nhận và đồ sẽ được treo bán 50–60 ngày" },
      { text: "Nhận tiền quyết toán khi đến hạn" },
    ],
  },
};
export const consignNotes = [
  "Đồ brand khách gửi tại cơ sở H.U.N Premium sẽ được giá tốt hơn và tốc độ bán nhanh hơn 2 cơ sở còn lại.",
  "Phí ship 2 chiều khách vui lòng tự thanh toán.",
] as const;
/** Snapshot of branch contacts; shared site-wide branch configuration should supersede this when approved. */
export const consignBranches: readonly ServiceBranchGroup[] = [
  { name: "H.U.N thường", description: "Chuyên nhận đồ No-brand, thời trang phổ thông, xưởng xả kho", branches: [
    { address: "48 Dịch Vọng Hậu", phone: "0397 710 510" },
    { address: "Cuối ngõ 109 Trường Chinh", phone: "0923 002 177" },
  ] },
  { name: "H.U.N Premium", description: "Chuyên nhận đồ local brand, global brand phân khúc bình dân, Quảng châu cao cấp. VD: D.chic, JM, Bohee, Hiu, Zara, H&M, Mango, Pedro, Cnk, Mlb....", branches: [
    { address: "09 Phương Liệt", phone: "0972 865 615" },
  ] },
];
