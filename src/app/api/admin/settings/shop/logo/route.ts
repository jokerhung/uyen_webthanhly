import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAdminSession, isSameOriginMutation } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { storePrivateImage, cleanupPrivateImages, detectImageType } from "@/lib/storage/images";

export const runtime = "nodejs";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return json({ error: "Chưa đăng nhập." }, 401);
  if (!isSameOriginMutation(request)) return json({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  let key: string | undefined;
  let committed = false;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Chưa chọn ảnh." }, 422);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 5 * 1024 * 1024 + 65536) { await reader.cancel(); return json({ error: "Ảnh tối đa 5 MB." }, 413); } chunks.push(chunk.value); }
    let form: FormData;
    try { form = await new Request("http://localhost/logo", { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData(); }
    catch { return json({ error: "Dữ liệu upload không hợp lệ." }, 422); }
    const file = form.get("logo"); const version = Number(form.get("version"));
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024 || !Number.isSafeInteger(version) || version < 1) return json({ error: "Chọn ảnh tối đa 5 MB và tải lại cấu hình nếu cần." }, 422);
    const bytes = Buffer.from(await file.arrayBuffer());
    const kind = detectImageType(bytes);
    if (!kind || kind.mimeType !== file.type) return json({ error: "Chỉ nhận JPG, PNG hoặc WebP." }, 422);
    let optimized: Buffer;
    try { optimized = await sharp(bytes, { limitInputPixels: 25_000_000, failOn: "error" }).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 90 }).toBuffer(); }
    catch { return json({ error: "Không đọc được ảnh logo." }, 422); }
    key = (await storePrivateImage(optimized)).storageKey;
    const result = await prisma.$transaction(async tx => {
      const before = await tx.shopSettings.findUniqueOrThrow({ where: { id: 1 } });
      const change = await tx.shopSettings.updateMany({ where: { id: 1, version }, data: { logoKey: key, version: { increment: 1 }, updatedById: admin.id } });
      if (change.count !== 1) return false;
      await tx.adminConfigEvent.create({ data: { adminId: admin.id, action: "upload-logo", entityType: "shop_settings", entityId: "1", before: { logoKey: before.logoKey }, after: { logoKey: key! } } });
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!result) return json({ error: "Cấu hình đã thay đổi. Tải lại trang trước khi upload." }, 409);
    committed = true;
    // Retain replaced files privately; only the current key is publicly accessible.
    revalidatePath("/", "layout");
    return json({ logoKey: key });
  } catch (error) { return json({ error: "Không thể lưu logo. Vui lòng tải lại trang và thử lại." }, error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" ? 409 : 500); }
  finally { if (key && !committed) await cleanupPrivateImages([key]).catch(() => console.error("Logo cleanup failed")); }
}
