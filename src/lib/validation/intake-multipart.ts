import { createHash } from "node:crypto";
import { z } from "zod";
import { getSiteConfig } from "@/content/site";
import { prisma } from "@/lib/db/client";
import { detectImageType } from "@/lib/storage/images";
import { intakeInputSchema } from "./consignment";

export type IntakeImage = { bytes: Buffer; itemIndex: number; sortOrder: number };
export type ParsedIntake = {
  name: string; phone: string; intakeType: "consign" | "buy"; items: z.output<typeof intakeInputSchema>["items"];
  images: IntakeImage[]; payloadHash: string;
};

export class IntakeValidationError extends Error { constructor(message: string, readonly status = 422) { super(message); } }

export async function parseIntake(form: FormData): Promise<ParsedIntake> {
  const config = getSiteConfig();
  if (!config.privacyPolicyReviewed) throw new IntakeValidationError("Chính sách thông tin khách chưa được phê duyệt; tạm ngừng nhận phiếu.", 503);
  if (!config.minimumConsignmentItems || !config.maxConsignmentItems || !config.maxImagesPerItem || !config.maxImageBytes)
    throw new IntakeValidationError("Chưa cấu hình giới hạn nhận ký gửi; tạm ngừng nhận phiếu.", 503);
  const rawItems = form.get("items");
  if (typeof rawItems !== "string" || rawItems.length > 150_000) throw new IntakeValidationError("Danh sách mặt hàng không hợp lệ.");
  let items: unknown;
  try { items = JSON.parse(rawItems); } catch { throw new IntakeValidationError("Danh sách mặt hàng không phải JSON hợp lệ."); }
  if (typeof items !== "object" || items === null || !Array.isArray(items) || items.length > config.maxConsignmentItems)
    throw new IntakeValidationError("Số mặt hàng vượt giới hạn đã cấu hình.");
  const name = form.get("name"); const phone = form.get("phone"); const consent = form.get("consent"); const intakeType = form.get("intakeType");
  const parsed = intakeInputSchema.safeParse({ name, phone, consent, intakeType, items });
  if (!parsed.success) throw new IntakeValidationError("Thông tin liên hệ hoặc mặt hàng không hợp lệ.");
  if (parsed.data.items.length < config.minimumConsignmentItems || parsed.data.items.length > config.maxConsignmentItems)
    throw new IntakeValidationError("Số mặt hàng vượt giới hạn đã cấu hình.");
  const categorySlugs = [...new Set(parsed.data.items.map(item => item.category))];
  const validCategories = await prisma.itemCategory.count({ where: { slug: { in: categorySlugs }, active: true } });
  if (validCategories !== categorySlugs.length) throw new IntakeValidationError("Loại mặt hàng không hợp lệ hoặc đã ngừng nhận.");
  const perItem = new Array(parsed.data.items.length).fill(0) as number[];
  const images: IntakeImage[] = [];
  const hash = createHash("sha256").update(JSON.stringify(parsed.data));
  for (const [key, value] of form.entries()) {
    if (["name", "phone", "consent", "intakeType", "items"].includes(key)) continue;
    const match = /^images\.(0|[1-9]\d*)$/.exec(key);
    if (!match || !(value instanceof File)) throw new IntakeValidationError("Trường hoặc ảnh không hợp lệ.");
    if (images.length >= config.maxConsignmentItems * config.maxImagesPerItem) throw new IntakeValidationError("Quá nhiều ảnh.", 413);
    const index = Number(match[1]);
    if (index >= perItem.length || perItem[index] >= config.maxImagesPerItem || value.size === 0 || value.size > config.maxImageBytes)
      throw new IntakeValidationError("Ảnh vượt giới hạn số lượng hoặc dung lượng.", 413);
    const bytes = Buffer.from(await value.arrayBuffer());
    const detected = detectImageType(bytes);
    if (!detected || value.type !== detected.mimeType) throw new IntakeValidationError("Nội dung ảnh không trùng loại JPEG, PNG hoặc WebP đã khai báo.");
    const order = perItem[index]++;
    images.push({ bytes, itemIndex: index, sortOrder: order });
    hash.update(`image:${index}:${order}:${bytes.length}:`);
    hash.update(bytes);
  }
  if (perItem.some(count => count < 1)) throw new IntakeValidationError("Mỗi mặt hàng phải có ít nhất một ảnh.");
  return { name: parsed.data.name, phone: parsed.data.phone!, intakeType: parsed.data.intakeType, items: parsed.data.items, images, payloadHash: hash.digest("hex") };
}
