import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cấu hình shop" };

export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <AdminPage title="Cấu hình">{children}</AdminPage>;
}
