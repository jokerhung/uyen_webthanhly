import { revalidatePath } from "next/cache";
import { getAdminSession, isSameOriginMutation } from "@/lib/auth/session";

export const categoryJson = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function checkCategoryMutation(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return { response: categoryJson({ error: "Chưa đăng nhập." }, 401) };
  if (!isSameOriginMutation(request)) return { response: categoryJson({ error: "Nguồn yêu cầu không hợp lệ." }, 403) };
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { response: categoryJson({ error: "Yêu cầu phải là JSON." }, 415) };
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return { response: categoryJson({ error: "Nội dung quá dài." }, 413) };
  try {
    const text = await request.text();
    if (text.length > 4096) return { response: categoryJson({ error: "Nội dung quá dài." }, 413) };
    return { admin, payload: JSON.parse(text) as unknown };
  } catch { return { response: categoryJson({ error: "JSON không hợp lệ." }, 400) }; }
}
export function revalidateCategoryConsumers() {
  for (const path of ["/", "/items", "/consign/submit", "/buy/submit", "/admin/items", "/admin/consignments", "/admin/settings/categories"]) revalidatePath(path);
  revalidatePath("/items/[slug]", "page");
  revalidatePath("/admin/items/[id]", "page");
}
