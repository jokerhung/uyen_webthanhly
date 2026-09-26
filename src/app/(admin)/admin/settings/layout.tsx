import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/admin-ui";
import { SettingsNavigation } from "@/components/admin/announcement-settings-form";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cấu hình shop" };

export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <AdminPage title="Cấu hình"><SettingsNavigation />{children}</AdminPage>;
}
