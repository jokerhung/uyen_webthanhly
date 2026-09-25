import { z } from "zod";
import { ItemStatus } from "@prisma/client";
import { statusActionTargets } from "./item-status";

const expectedStatus = z.enum(ItemStatus);
const reason = z.string().trim().max(1000).optional();
const optionId = z.string().trim().min(1).max(100);

export const statusActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("intake"), expectedStatus, reason }).strict(),
  z.object({ action: z.literal("negotiate"), expectedStatus, reason }).strict(),
  z.object({ action: z.literal("receive"), expectedStatus, reason }).strict(),
  z.object({ action: z.literal("approve"), expectedStatus, genderId: optionId, seasonId: optionId, category: optionId, materialId: optionId, sizeId: optionId, brandId: optionId, priceOptionId: optionId }).strict(),
  z.object({ action: z.literal("sold"), expectedStatus, reason }).strict(),
  z.object({ action: z.literal("settle"), expectedStatus, reason }).strict(),
  z.object({ action: z.literal("reject"), expectedStatus, reason }).strict(),
  z.object({ action: z.literal("delete"), expectedStatus, reason }).strict(),
]).refine(command => command.expectedStatus !== statusActionTargets[command.action], {
  message: "Trạng thái mới phải khác trạng thái hiện tại.", path: ["action"],
});
