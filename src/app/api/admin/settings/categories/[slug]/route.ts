import { Prisma } from "@prisma/client";
import { setCategoryActive } from "@/lib/admin/categories";
import { categoryJson, checkCategoryMutation, revalidateCategoryConsumers } from "@/lib/admin/category-routes";
import { categorySlugSchema, toggleCategorySchema } from "@/lib/admin/category-validation";

export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const check = await checkCategoryMutation(request);
  if (check.response) return check.response;
  if (!check.admin) return categoryJson({ error: "Chưa đăng nhập." }, 401);
  const slug = categorySlugSchema.safeParse((await params).slug);
  if (!slug.success) return categoryJson({ error: "Mã loại sản phẩm không hợp lệ." }, 400);
  const parsed = toggleCategorySchema.safeParse(check.payload);
  if (!parsed.success) return categoryJson({ error: "Trạng thái không hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors }, 422);
  try {
    const result = await setCategoryActive(slug.data, parsed.data.expectedActive, parsed.data.active, check.admin.id);
    if (result.kind === "missing") return categoryJson({ error: "Không tìm thấy loại sản phẩm." }, 404);
    if (result.kind === "conflict") return categoryJson({ error: "Loại sản phẩm đã đổi trạng thái. Vui lòng tải lại." }, 409);
    revalidateCategoryConsumers();
    return categoryJson({ category: result.category }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return categoryJson({ error: "Có thao tác đồng thời. Vui lòng tải lại." }, 409);
    console.error("Category state mutation failed", error instanceof Error ? error.name : "UnknownError");
    return categoryJson({ error: "Không thể đổi trạng thái loại sản phẩm." }, 500);
  }
}
