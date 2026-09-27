import { prisma } from "@/lib/db/client";
import { catalogWhere } from "@/lib/catalog/queries";
import { readProductImage, ProductImageNotFound } from "@/lib/storage/product-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; imageId: string }> }): Promise<Response> {
  const { slug, imageId } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(imageId)) return notFound();
  const image = await prisma.itemImage.findFirst({
    where: { id: imageId, item: { ...catalogWhere, slug } },
    select: { storageKey: true },
  });
  if (!image) return notFound();
  try {
    const bytes = await readProductImage(image.storageKey);
    const mimeType = image.storageKey.endsWith(".webp") ? "image/webp" : image.storageKey.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": mimeType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
  } catch (error) {
    if (error instanceof ProductImageNotFound || (error instanceof Error && "code" in error && error.code === "ENOENT")) return notFound();
    console.error("Public product image storage unavailable", error instanceof Error ? error.name : "UnknownError");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}
