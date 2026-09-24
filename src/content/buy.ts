import type { BuyPrice, CriteriaGroup, ServiceProcesses } from "@/types/services";

/** Reference-site public copy captured 2026-09-23; pricing and campaign availability require confirmation. */
export const buyAnnouncement = [
  "Thu mua chỉ áp dụng ngắn ngày theo chương trình được thông báo trên TikTok & Facebook.",
  "Riêng H.U.N Premium nhận thu mua phụ kiện chính hãng quanh năm.",
] as const;
export const buyPrices: readonly BuyPrice[] = [
  { name: "Đồ No Brand", price: "80k – 100k / kg" },
  { name: "Đồ Brand", price: "150k – 200k / kg" },
  { name: "Phụ kiện", price: "Báo giá theo chiếc" },
];
export const buyCriteria: readonly CriteriaGroup[] = [
  { title: "Đối với quần áo:", items: ["Quần áo độ mới cao trên 90%", "Không thu đồ quá dày như áo dạ dài, đồ đính đá nhiều hay dây xích nặng"] },
  { title: "Đối với phụ kiện:", items: ["Túi xách, giày dép cần được lau sạch, không bong tróc da"] },
];
export const buyProcesses: ServiceProcesses = {
  direct: {
    label: "Thu Mua Trực Tiếp",
    note: "Khuyên dùng cho khách nội thành Hà Nội — trao đổi giá bán trực tiếp với nhân viên.",
    steps: [
      { text: "Gọi hotline để được tư vấn và sắp lịch", detail: "Khung giờ trực hotline: 10h–20h30" },
      { text: "Mang đồ tới H.U.N.", detail: "Nhân viên kiểm tra và định giá trực tiếp" },
      { text: "Xác nhận giá thu mua", detail: "Thoả thuận giá thu với nhân viên và thanh toán ngay tại chỗ" },
    ],
  },
  online: {
    label: "Thu Mua Online",
    steps: [
      { text: "Chụp ảnh túi đồ, gửi ảnh kèm SĐT qua Zalo chính thức của H.U.N - ", link: { label: "Nhấn tại đây", href: "https://zalo.me/hunthanhly" }, warning: "Lưu ý: Đồ có giá trị cao H.U.N chỉ nhận trực tiếp KHÔNG NHẬN SHIP" },
      { text: 'Dán thông tin "Tên + SĐT" lên túi, ship trong khung giờ 10h–20h30' },
      { text: "Nhận báo giá qua Zalo trong 10-15 ngày" },
      { text: "Xác nhận và H.U.N sẽ thanh toán ngay" },
    ],
  },
};
