import { createHash, randomBytes } from "node:crypto";
import { Prisma, IntakeType, type ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { checkIntakeRateLimit } from "@/lib/db/rate-limit";
import { cleanupPrivateImages, storePrivateImage } from "@/lib/storage/images";
import { IntakeValidationError, parseIntake } from "@/lib/validation/intake-multipart";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  // This endpoint does not accept anonymous data before the privacy policy is approved.
  if (process.env.PRIVACY_POLICY_REVIEWED !== "true") return json({ error: "Chưa phê duyệt chính sách dữ liệu; tạm ngừng nhận phiếu." }, 503);
  const contentType = request.headers.get("content-type") ?? "";
  const allowedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  // Modern browsers send both headers; trusted non-browser clients may omit them.
  if ((origin && origin !== allowedOrigin) || (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none"))
    return json({ error: "Yêu cầu khác nguồn không được phép." }, 403);
  const key = request.headers.get("idempotency-key") ?? "";
  if (!contentType.startsWith("multipart/form-data;") || !/^[a-zA-Z0-9_-]{16,128}$/.test(key))
    return json({ error: "Yêu cầu thiếu khóa chống gửi lặp hoặc định dạng không hợp lệ." }, 400);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_REQUEST_BYTES) return json({ error: "Yêu cầu vượt giới hạn dung lượng." }, 413);

  const storedKeys: string[] = [];
  let committed = false;
  let parsedHash: string | undefined;
  try {
    // Request remains bounded even when a client omits Content-Length.
    const raw = await request.arrayBuffer();
    if (raw.byteLength > MAX_REQUEST_BYTES) return json({ error: "Yêu cầu vượt giới hạn dung lượng." }, 413);
    const formRequest = new Request("http://localhost/intake", { method: "POST", headers: { "content-type": contentType }, body: raw });
    const parsed = await parseIntake(await formRequest.formData());
    parsedHash = parsed.payloadHash;
    const existing = await prisma.intakeRequest.findUnique({ where: { key }, select: { payloadHash: true, consignment: { select: { publicCode: true } } } });
    if (existing) return existing.payloadHash === parsed.payloadHash
      ? json({ public_code: existing.consignment.publicCode, pending: true }, 200)
      : json({ error: "Khóa gửi lặp đã được dùng với nội dung khác." }, 409);

    // Rate limits are shared by instances, never rely on request-supplied client IP.
    // Forwarded headers are only trustworthy when set/overwritten by a controlled proxy.
    // Until a trusted proxy is configured, use a shared bucket to avoid client-controlled spoofing.
    const clientAddress = "anonymous-intake";
    const clientHash = createHash("sha256").update(clientAddress).digest("hex");
    if (!(await checkIntakeRateLimit(clientHash))) return json({ error: "Quá nhiều lần gửi. Vui lòng thử lại sau." }, 429);

    // Decode/reencode validated images: removes EXIF (including GPS), rejects malformed files and limits pixels.
    const sharp = (await import("sharp")).default;
    const uploaded: { itemIndex: number; sortOrder: number; storageKey: string }[] = [];
    for (const image of parsed.images) {
      let optimized: Buffer;
      try {
        optimized = await sharp(image.bytes, { limitInputPixels: 40_000_000, failOn: "error" }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      } catch { throw new IntakeValidationError("Ảnh bị hỏng hoặc định dạng không được hỗ trợ."); }
      const saved = await storePrivateImage(optimized);
      storedKeys.push(saved.storageKey);
      uploaded.push({ itemIndex: image.itemIndex, sortOrder: image.sortOrder, storageKey: saved.storageKey });
    }

    const publicCode = `HUN-${randomBytes(16).toString("hex").toUpperCase()}`;
    const result = await prisma.$transaction(async tx => {
      // Re-check in the write transaction so a category disabled while images upload cannot slip through.
      const categorySlugs = [...new Set(parsed.items.map(item => item.category))];
      const activeCount = await tx.itemCategory.count({ where: { slug: { in: categorySlugs }, active: true } });
      if (activeCount !== categorySlugs.length) throw new IntakeValidationError("Loại mặt hàng không hợp lệ hoặc đã ngừng nhận.");
      const receipt = await tx.consignment.create({ data: {
        publicCode,
        intakeType: parsed.intakeType === "buy" ? IntakeType.BUY : IntakeType.CONSIGN,
        consignor: { create: { name: parsed.name, phoneNormalized: parsed.phone } },
        items: { create: parsed.items.map((item, index) => ({
          slug: `pending-${randomBytes(16).toString("hex")}`,
          name: item.name, category: item.category, description: item.description, condition: item.condition,
          desiredPrice: item.desiredPrice,
          // Never take status, salePrice, reviewer, or publishedAt from the public request.
          status: "PENDING" as ItemStatus,
          images: { create: uploaded.filter(image => image.itemIndex === index).map(image => ({ storageKey: image.storageKey, sortOrder: image.sortOrder, altText: item.name })) },
        })) },
      }, select: { id: true, publicCode: true } });
      await tx.intakeRequest.create({ data: { key, payloadHash: parsed.payloadHash, consignmentId: receipt.id } });
      return receipt;
    });
    committed = true;
    return json({ public_code: result.publicCode, pending: true }, 201);
  } catch (error) {
    if (error instanceof IntakeValidationError) return json({ error: error.message }, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const previous = await prisma.intakeRequest.findUnique({ where: { key }, select: { payloadHash: true, consignment: { select: { publicCode: true } } } }).catch(() => null);
      if (previous) {
        if (previous.payloadHash === parsedHash) {
          return json({ public_code: previous.consignment.publicCode, pending: true }, 200);
        }
        return json({ error: "Khóa gửi lặp đã được dùng với nội dung khác." }, 409);
      }
    }
    console.error("Consignment intake failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Không thể lưu phiếu. Vui lòng thử lại với cùng nội dung." }, 500);
  } finally {
    if (!committed && storedKeys.length) {
      try { await cleanupPrivateImages(storedKeys); }
      catch { console.error("Private upload cleanup failed; operational review required."); }
    }
  }
}
