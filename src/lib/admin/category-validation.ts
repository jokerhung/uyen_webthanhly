import { z } from "zod";

/** Same normalization as item_category_normalized_name() in the SQL migration. */
export function normalizeCategoryName(value: string) {
  const name = value.trim().replace(/[\s\u00a0]+/gu, " ").normalize("NFC");
  return { name, normalizedName: name.toLowerCase() };
}
export const createCategorySchema = z.object({ name: z.string().transform(normalizeCategoryName).refine(value => value.name.length >= 1 && value.name.length <= 100, "Tên loại sản phẩm cần từ 1 đến 100 ký tự.") }).strict();
export const toggleCategorySchema = z.object({ active: z.boolean(), expectedActive: z.boolean() }).strict().refine(value => value.active !== value.expectedActive, { path: ["active"], message: "Trạng thái mới phải khác trạng thái hiện tại." });
export const categorySlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug không hợp lệ.");
