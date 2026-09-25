import { z } from "zod";
import { normalizeVietnamesePhone } from "./settlement";

export const itemInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(4000),
  condition: z.string().trim().min(1).max(200),
  desiredPrice: z.union([z.string(), z.number()]).transform(value => String(value)).refine(value => /^\d{1,14}$/.test(value) && Number(value) > 0, "Giá mong muốn phải là số dương").transform(value => Number(value)),
}).strict();

export const intakeInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  phone: z.string().transform(value => normalizeVietnamesePhone(value)).refine(value => value !== null, "Số điện thoại không hợp lệ"),
  consent: z.literal("true"),
  intakeType: z.enum(["consign", "buy"]),
  items: z.array(itemInputSchema).min(1).max(30),
}).strict();
