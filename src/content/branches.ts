import type { BranchGroup } from "@/types/content";

// Addresses are transcribed from the rendered reference; direction URLs remain disabled
// until each third-party destination has been independently checked and approved.
export const branchGroups: readonly BranchGroup[] = [
  {
    name: "H.U.N thường",
    description: "Chuyên nhận đồ No-brand, thời trang phổ thông, xưởng xả kho",
    branches: [
      { id: "dich-vong-hau", address: "48 Dịch Vọng Hậu", directionsStatus: "unverified" },
      { id: "truong-chinh", address: "Cuối ngõ 109 Trường Chinh", directionsStatus: "unverified" },
    ],
  },
  {
    name: "H.U.N Premium",
    description: "Chuyên nhận đồ local brand, global brand phân khúc bình dân, Quảng châu cao cấp. VD: D.chic, JM, Bohee, Hiu, Zara, H&M, Mango, Pedro, Cnk, Mlb....",
    branches: [
      { id: "phuong-liet", address: "09 Phương Liệt", directionsStatus: "unverified" },
    ],
  },
];

export const openingHours = "10h–20h30";
