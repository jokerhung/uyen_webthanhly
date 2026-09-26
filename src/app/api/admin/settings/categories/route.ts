import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/auth/session";
import { createCategory, listCategories } from "@/lib/admin/categories";
import { categoryJson, checkCategoryMutation, revalidateCategoryConsumers } from "@/lib/admin/category-routes";
import { createCategorySchema } from "@/lib/admin/category-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  if (!await getAdminSession()) return categoryJson({ error: "Chưa đăng nhập." }, 401);
  return categoryJson({ categories: await listCategories() }, 200);
}
export async function POST(request: Request): Promise<Response> {
  const check = await checkCategoryMutation(request);
  if (check.response) return check.response;
  if (!check.admin) return categoryJson({ error: "Chưa đăng nhập." }, 401);
  const parsed = createCategorySchema.safeParse(check.payload);
  if (!parsed.success) return categoryJson({ error: "Tên loại sản phẩm không hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors }, 422);
  try {
    const result = await createCategory(parsed.data.name, check.admin.id);
    if (result.kind === "duplicate") return categoryJson({ error: result.existing?.active ? "Loại sản phẩm này đã tồn tại." : "Loại sản phẩm đã bị xóa; hãy khôi phục thay vì thêm mới.", existing: result.existing }, 409);
    revalidateCategoryConsumers();
    return categoryJson({ category: result.category }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return categoryJson({ error: "Có thao tác đồng thời. Vui lòng thử lại." }, 409);
    console.error("Category creation failed", error instanceof Error ? error.name : "UnknownError");
    return categoryJson({ error: "Không thể thêm loại sản phẩm." }, 500);
  }
}
