import { revalidatePath } from "next/cache";
import { getAdminSession, isSameOriginMutation } from "@/lib/auth/session";
import { getAnnouncementSettings, updateAnnouncementSettings } from "@/lib/shop/announcement";
import { announcementInputSchema } from "@/lib/shop/announcement-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: object, status: number) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(): Promise<Response> {
  if (!await getAdminSession()) return json({ error: "Chưa đăng nhập." }, 401);
  return json({ settings: await getAnnouncementSettings() }, 200);
}

export async function PATCH(request: Request): Promise<Response> {
  const admin = await getAdminSession();
  if (!admin) return json({ error: "Chưa đăng nhập." }, 401);
  if (!isSameOriginMutation(request)) return json({ error: "Nguồn yêu cầu không hợp lệ." }, 403);
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return json({ error: "Yêu cầu phải là JSON." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 8192) return json({ error: "Nội dung quá dài." }, 413);
  let input: unknown;
  try {
    const text = await request.text();
    if (text.length > 8192) return json({ error: "Nội dung quá dài." }, 413);
    input = JSON.parse(text);
  } catch { return json({ error: "JSON không hợp lệ." }, 400); }
  const parsed = announcementInputSchema.safeParse(input);
  if (!parsed.success) return json({ error: "Chữ chạy không hợp lệ.", fieldErrors: parsed.error.flatten().fieldErrors }, 422);
  try {
    const result = await updateAnnouncementSettings(parsed.data, admin.id);
    if (result.kind === "conflict") return json({ error: "Cấu hình đã được sửa cùng lúc. Vui lòng tải lại.", settings: await getAnnouncementSettings() }, 409);
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/announcement");
    return json({ settings: result.settings }, 200);
  } catch (error) {
    console.error("Shop announcement update failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Không thể lưu chữ chạy." }, 500);
  }
}
