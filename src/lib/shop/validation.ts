import { z } from "zod";
import { normalizeVietnamesePhone } from "../validation/settlement";

const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Màu phải có dạng #RRGGBB.").transform(value => value.toUpperCase());
const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Giờ phải có dạng HH:mm.");
const facebook = z.string().trim().url("Đường dẫn Facebook không hợp lệ.").max(2048).refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(url.hostname.toLowerCase()) && !url.port;
  } catch { return false; }
}, "Chỉ nhận URL HTTPS của Facebook, không có credentials.");

export const shopSettingsInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  shopName: z.string().trim().min(1, "Vui lòng nhập tên shop.").max(120),
  slogan: z.string().trim().min(1, "Vui lòng nhập slogan.").max(200, "Slogan tối đa 200 ký tự."),
  primaryColor: color,
  backgroundColor: color,
  surfaceColor: color,
  address: z.string().trim().min(1, "Vui lòng nhập địa chỉ.").max(500),
  facebookUrl: facebook,
  phone: z.string().transform(value => normalizeVietnamesePhone(value)).pipe(z.string({ error: "Số điện thoại Việt Nam không hợp lệ." })),
  opensAt: hour,
  closesAt: hour,
}).strict().refine(value => value.opensAt !== value.closesAt, { path: ["closesAt"], message: "Giờ đóng không được trùng giờ mở." });

export type ShopSettingsInput = z.output<typeof shopSettingsInputSchema>;
