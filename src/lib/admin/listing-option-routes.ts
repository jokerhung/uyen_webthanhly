import { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/auth/session";
import { categoryJson, checkCategoryMutation, revalidateCategoryConsumers } from "./category-routes";
import { createManagedOption, listManagedOptions, setManagedOptionActive } from "./listing-options";
import { createListingOptionSchema, listingOptionIdSchema, toggleCategorySchema, type ManagedListingKind } from "./listing-option-validation";

function refresh() {
  // Route consumers already revalidate catalog and item editor; the manager reads no-store.
  revalidateCategoryConsumers();
}
export async function getManagedOptions(kind: ManagedListingKind): Promise<Response> {
  if (!await getAdminSession()) return categoryJson({ error: "Chưa đăng nhập." }, 401);
  return categoryJson({ categories: await listManagedOptions(kind) }, 200);
}
export async function postManagedOption(kind: ManagedListingKind, request: Request): Promise<Response> {
  const check = await checkCategoryMutation(request);
  if (check.response) return check.response;
  if (!check.admin) return categoryJson({ error: "Chưa đăng nhập." }, 401);
  const parsed = createListingOptionSchema.safeParse(check.payload);
  if (!parsed.success) return categoryJson({ error: "Tên không hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors }, 422);
  try {
    const result = await createManagedOption(kind, parsed.data.name, check.admin.id);
    if (result.kind === "duplicate") return categoryJson({ error: result.existing?.active ? "Tên này đã tồn tại." : "Tên này đã bị xóa; hãy khôi phục bản ghi cũ.", existing: result.existing }, 409);
    refresh();
    return categoryJson({ category: result.category }, 201);
  } catch (error) { return optionError(error); }
}
export async function patchManagedOption(kind: ManagedListingKind, request: Request, params: Promise<{ id: string }>): Promise<Response> {
  const check = await checkCategoryMutation(request);
  if (check.response) return check.response;
  if (!check.admin) return categoryJson({ error: "Chưa đăng nhập." }, 401);
  const id = listingOptionIdSchema.safeParse((await params).id);
  if (!id.success) return categoryJson({ error: "ID không hợp lệ." }, 400);
  const parsed = toggleCategorySchema.safeParse(check.payload);
  if (!parsed.success) return categoryJson({ error: "Trạng thái không hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors }, 422);
  try {
    const result = await setManagedOptionActive(kind, id.data, parsed.data.expectedActive, parsed.data.active, check.admin.id);
    if (result.kind === "missing") return categoryJson({ error: "Không tìm thấy lựa chọn trong nhóm này." }, 404);
    if (result.kind === "conflict") return categoryJson({ error: "Trạng thái đã thay đổi. Vui lòng tải lại." }, 409);
    refresh();
    return categoryJson({ category: result.category }, 200);
  } catch (error) { return optionError(error); }
}
function optionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return categoryJson({ error: "Có thao tác đồng thời. Vui lòng tải lại." }, 409);
  console.error("Listing option mutation failed", error instanceof Error ? error.name : "UnknownError");
  return categoryJson({ error: "Không thể lưu lựa chọn." }, 500);
}
