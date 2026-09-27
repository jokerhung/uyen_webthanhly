import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  if (await getAdminSession()) redirect("/admin/consignments");
  const { error } = await searchParams;
  return <main className="mx-auto max-w-md px-5 py-16"><h1 className="mb-3 text-2xl font-bold">Đăng nhập quản trị</h1><p className="mb-6 text-sm text-neutral-600">Chỉ tài khoản quản trị được cấp quyền mới truy cập được dữ liệu khách hàng.</p><LoginForm error={typeof error === "string" ? error : undefined} /></main>;
}
