import { z } from "zod";
import { normalizeCategoryName, toggleCategorySchema } from "./category-validation";

export const listingOptionKinds = ["brand", "size", "material"] as const;
export type ManagedListingKind = (typeof listingOptionKinds)[number];
export const listingKindSchema = z.enum(listingOptionKinds);
export const createListingOptionSchema = z.object({ name: z.string().transform(normalizeCategoryName).refine(value => value.name.length >= 1 && value.name.length <= 100, "Tên phải có từ 1 đến 100 ký tự.") }).strict();
export { toggleCategorySchema };
export const listingOptionIdSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "ID không hợp lệ.");
