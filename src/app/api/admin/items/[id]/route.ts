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
  const to = command.action === "edit" ? from : statusActionTargets[command.action];
  try {
    const updated = await prisma.$transaction(async tx => {
      const current = await tx.item.findUnique({ where: { id }, select: { slug: true, status: true, consignment: { select: { intakeType: true } } } });
      if (!current) return { kind: "missing" as const };
      if (current.status !== from || command.expectedStatus !== from) return { kind: "conflict" as const };
      if (command.action === "approve" && current.consignment.intakeType !== "CONSIGN") return { kind: "unsupported" as const };
      let listingData: Prisma.ItemUncheckedUpdateManyInput = {};
      if (command.action === "approve" || command.action === "edit") {
        const required = { genderId: "gender", seasonId: "season", materialId: "material", sizeId: "size", brandId: "brand" } as const;
        const ids = Object.keys(required).map(key => command[key as keyof typeof required]);

        const choices = await tx.listingOption.findMany({ where: { id: { in: ids }, active: true } });
        const category = await tx.itemCategory.findFirst({ where: { slug: command.category, active: true } });
        if (!category || Object.entries(required).some(([key, kind]) => !choices.some(choice => choice.id === command[key as keyof typeof required] && choice.kind === kind))) return { kind: "invalidOptions" as const };
        const price = new Prisma.Decimal(command.salePrice);
        if (!price || !price.greaterThan(0)) return { kind: "invalidOptions" as const };
        listingData = { genderId: command.genderId, seasonId: command.seasonId, materialId: command.materialId, sizeId: command.sizeId, brandId: command.brandId, priceOptionId: null, category: command.category, salePrice: price };
      }
      const now = new Date();
      const change = await tx.item.updateMany({ where: { id, status: from, ...(command.action === "edit" ? { updatedAt: new Date(command.expectedUpdatedAt) } : {}) }, data: {
        status: to,
        ...listingData,
        ...(command.action === "edit" ? { description: command.description, condition: command.condition } : {}),
        ...(command.action === "approve" ? { publishedAt: now, reviewedAt: now, reviewedById: admin.id } : {}),
        ...(command.action === "receive" ? { reviewedAt: now, reviewedById: admin.id } : {}),
      } });
      if (change.count !== 1) return { kind: "conflict" as const };
      await tx.itemStatusEvent.create({ data: { itemId: id, fromStatus: from, toStatus: to, actorAdminId: admin.id, reason: command.action === "edit" ? "Cập nhật mô tả, thuộc tính và giá bán (giữ nguyên trạng thái)." : "reason" in command ? command.reason || null : null } });
      return { kind: "success" as const, status: to as ItemStatus, slug: current.slug };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (updated.kind === "missing") return json({ error: "Không tìm thấy mặt hàng." }, 404);
    if (updated.kind === "invalidOptions") return json({ error: "Vui lòng chọn đầy đủ giới tính, mùa, danh mục, chất liệu, kích thước, nhãn hiệu và giá đang được sử dụng trong danh mục." }, 422);
    if (updated.kind === "conflict") return json({ error: "Mặt hàng đã thay đổi trạng thái. Vui lòng tải lại." }, 409);
    if (updated.kind === "unsupported") return json({ error: "Phiếu thu mua cần quy trình báo giá riêng; không thể đưa mặt hàng lên danh mục bán." }, 422);
    revalidatePath("/items");
    revalidatePath("/");
    revalidatePath("/admin/consignments", "layout");
    revalidatePath(`/items/${updated.slug}`);
    revalidatePath("/admin/items");
    revalidatePath(`/admin/items/${id}`);
    return json({ status: updated.status }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return json({ error: "Có thao tác đồng thời. Vui lòng tải lại." }, 409);
    console.error("Admin item mutation failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Không thể lưu thay đổi." }, 500);
  }
}
