import { revalidatePath } from "next/cache";
import { ItemStatus, Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/auth/session";
import { isSameOriginMutation } from "@/lib/auth/session";
import { statusActionSchema } from "@/lib/admin/status-transitions";
import { statusActionTargets } from "@/lib/admin/item-status";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";
const json = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const admin = await getAdminSession();
  if (!admin) return json({ error: "Chưa đăng nhập quản trị." }, 401);
  if (!isSameOriginMutation(request)) return json({ error: "Nguồn gửi yêu cầu không hợp lệ." }, 403);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json({ error: "ID mặt hàng không hợp lệ." }, 400);
  let payload: unknown;
  try { payload = await request.json(); } catch { return json({ error: "JSON không hợp lệ." }, 400); }
  const parsed = statusActionSchema.safeParse(payload);
  if (!parsed.success) return json({ error: "Trạng thái, giá hoặc lý do không hợp lệ." }, 422);
  const command = parsed.data;
  const from = command.expectedStatus;
  const to = statusActionTargets[command.action];
  try {
    const updated = await prisma.$transaction(async tx => {
      const current = await tx.item.findUnique({ where: { id }, select: { status: true, consignment: { select: { intakeType: true } } } });
      if (!current) return { kind: "missing" as const };
      if (current.status !== from || command.expectedStatus !== from) return { kind: "conflict" as const };
      const now = new Date();
      const change = await tx.item.updateMany({ where: { id, status: from }, data: {
        status: to,
        ...(command.action === "approve" ? { salePrice: command.salePrice, publishedAt: now, reviewedAt: now, reviewedById: admin.id } : {}),
        ...(command.action === "receive" ? { reviewedAt: now, reviewedById: admin.id } : {}),
      } });
      if (change.count !== 1) return { kind: "conflict" as const };
      await tx.itemStatusEvent.create({ data: { itemId: id, fromStatus: from, toStatus: to, actorAdminId: admin.id, reason: "reason" in command ? command.reason || null : null } });
      return { kind: "success" as const, status: to as ItemStatus };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (updated.kind === "missing") return json({ error: "Không tìm thấy mặt hàng." }, 404);
    if (updated.kind === "conflict") return json({ error: "Mặt hàng đã thay đổi trạng thái. Vui lòng tải lại." }, 409);
    revalidatePath("/items");
    revalidatePath("/admin/items");
    revalidatePath(`/admin/items/${id}`);
    return json({ status: updated.status }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return json({ error: "Có thao tác đồng thời. Vui lòng tải lại." }, 409);
    console.error("Admin item mutation failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Không thể lưu thay đổi." }, 500);
  }
}
