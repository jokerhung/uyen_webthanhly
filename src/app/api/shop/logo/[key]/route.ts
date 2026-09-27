import { prisma } from "@/lib/db/client";
import { readPrivateImage } from "@/lib/storage/images";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (!/^[a-f0-9]{64}\.webp$/.test(key)) return new Response(null, { status: 404, headers });
  const shop = await prisma.shopSettings.findUnique({ where: { id: 1 }, select: { logoKey: true } });
  if (shop?.logoKey !== key) return new Response(null, { status: 404, headers });
  try { return new Response(new Uint8Array(await readPrivateImage(key)), { headers: { ...headers, "Content-Type": "image/webp" } }); }
  catch { return new Response(null, { status: 404, headers }); }
}
