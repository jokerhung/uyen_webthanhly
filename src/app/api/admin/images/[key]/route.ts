import { getAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { readProductImage, ProductImageNotFound } from "@/lib/storage/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }): Promise<Response> {
  if (!await getAdminSession()) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  const { key } = await params;
  if (!/^[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(key)) return new Response(null, { status: 404 });
  const image = await prisma.itemImage.findUnique({ where: { storageKey: key }, select: { id: true } });
  if (!image) return new Response(null, { status: 404 });
  try {
    const bytes = await readProductImage(key);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": key.endsWith(".webp") ? "image/webp" : key.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
  } catch (error) {
    if (error instanceof ProductImageNotFound || (error instanceof Error && "code" in error && error.code === "ENOENT")) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    console.error("Admin product image storage unavailable", error instanceof Error ? error.name : "UnknownError");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
