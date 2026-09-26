import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { getAdminSession, isSameOriginMutation } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getSiteConfig } from "@/content/site";
import { cleanupPrivateImages, detectImageType, storePrivateImage } from "@/lib/storage/images";

export const runtime = "nodejs";
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const inputSchema = z.object({ updatedAt: z.iso.datetime(), remove: z.array(z.uuid()).max(100) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return reply({ error: "Chưa đăng nhập quản trị." }, 401);
  if (!isSameOriginMutation(request)) return reply({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return reply({ error: "Mặt hàng không hợp lệ." }, 400);
  const config = getSiteConfig();
  const maxImages = Math.min(config.maxImagesPerItem ?? 5, 30);
  const maxBytes = Math.min(config.maxImageBytes ?? 5 * 1024 * 1024, 10 * 1024 * 1024);
  const maxRequest = Math.min(maxImages * maxBytes + 65536, 55 * 1024 * 1024);
  const uploaded: string[] = [];
  let committed = false;
  try {
    // Bound the stream before decoding multipart, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Thiếu dữ liệu ảnh." }, 400);
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maxRequest) { await reader.cancel(); return reply({ error: "Dung lượng tải lên quá lớn." }, 413); }
      chunks.push(chunk.value);
    }
    let form: FormData; let input: z.infer<typeof inputSchema>;
    try {
      form = await new Request("http://localhost/upload", { method: "POST", headers: { "content-type": request.headers.get("content-type") ?? "" }, body: Buffer.concat(chunks) }).formData();
      input = inputSchema.parse({ updatedAt: form.get("updatedAt"), remove: JSON.parse(String(form.get("remove") ?? "[]")) });
    } catch { return reply({ error: "Dữ liệu ảnh không hợp lệ." }, 422); }
    const files = form.getAll("images");
    if (files.length > maxImages || (!files.length && !input.remove.length)) return reply({ error: "Chọn ảnh để thêm hoặc xóa." }, 422);
    for (const file of files) {
      if (!(file instanceof File) || !file.size || file.size > maxBytes) return reply({ error: "Ảnh vượt giới hạn dung lượng." }, 413);
      const bytes = Buffer.from(await file.arrayBuffer());
      if (detectImageType(bytes)?.mimeType !== file.type || !detectImageType(bytes)) return reply({ error: "Chỉ nhận ảnh JPG, PNG hoặc WebP hợp lệ." }, 422);
      let optimized: Buffer;
      try { optimized = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(); }
      catch { return reply({ error: "Ảnh bị hỏng hoặc không thể đọc." }, 422); }
      uploaded.push((await storePrivateImage(optimized)).storageKey);
    }
    const result = await prisma.$transaction(async tx => {
      const item = await tx.item.findUnique({ where: { id }, include: { images: true } });
      if (!item) return { kind: "missing" as const };
      if (item.updatedAt.toISOString() !== input.updatedAt) return { kind: "conflict" as const };
      const removed = item.images.filter(image => input.remove.includes(image.id));
      if (removed.length !== new Set(input.remove).size) return { kind: "invalid" as const };
      const count = item.images.length - removed.length + uploaded.length;
      if (count > maxImages || (item.status === "APPROVED" && count < 1)) return { kind: "limit" as const };
      const changed = await tx.item.updateMany({ where: { id, updatedAt: new Date(input.updatedAt) }, data: { updatedAt: new Date() } });
      if (changed.count !== 1) return { kind: "conflict" as const };
      await tx.itemImage.deleteMany({ where: { itemId: id, id: { in: input.remove } } });
      const order = Math.max(-1, ...item.images.map(image => image.sortOrder)) + 1;
      if (uploaded.length) await tx.itemImage.createMany({ data: uploaded.map((storageKey, index) => ({ itemId: id, storageKey, sortOrder: order + index, altText: item.name })) });
      await tx.itemStatusEvent.create({ data: { itemId: id, fromStatus: item.status, toStatus: item.status, actorAdminId: admin.id, reason: `Cập nhật ảnh: thêm ${uploaded.length}, xóa ${removed.length}.` } });
      return { kind: "success" as const, removed: removed.map(image => image.storageKey), slug: item.slug };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.kind !== "success") return reply({ error: result.kind === "limit" ? `Tối đa ${maxImages} ảnh; mặt hàng đang bán phải giữ ít nhất một ảnh.` : result.kind === "missing" ? "Không tìm thấy mặt hàng." : result.kind === "invalid" ? "Ảnh không thuộc mặt hàng này." : "Mặt hàng đã thay đổi. Vui lòng tải lại trang." }, result.kind === "conflict" ? 409 : result.kind === "missing" ? 404 : 422);
    committed = true;
    // The DB removal already revokes both public and admin image URLs.
    await cleanupPrivateImages(result.removed).catch(() => console.error("Removed image file cleanup requires operational review"));
    revalidatePath("/"); revalidatePath("/items"); revalidatePath(`/items/${result.slug}`);
    revalidatePath("/admin/items"); revalidatePath(`/admin/items/${id}`); revalidatePath("/admin/consignments", "layout");
    return reply({ success: true });
  } catch (error) {
    return reply({ error: error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" ? "Có thay đổi đồng thời. Vui lòng tải lại trang." : "Không thể lưu ảnh. Vui lòng tải lại trang để kiểm tra trước khi thử lại." }, error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" ? 409 : 500);
  } finally {
    if (!committed) await cleanupPrivateImages(uploaded).catch(() => console.error("Upload rollback requires operational review"));
  }
}
