import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { AdminPage } from "@/components/admin/admin-ui";
import { ItemWorkspace, itemWorkspaceInclude } from "@/components/admin/item-workspace";

export default async function ItemDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string | string[] }> }) {
  await requireAdmin();
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id }, include: itemWorkspaceInclude });
  if (!item) notFound();
  const fromConsignment = (await searchParams).from === "consignment";
  const backHref = fromConsignment ? `/admin/consignments/${item.consignment.id}#items` : "/admin/items";
  return <AdminPage title="Chi tiết mặt hàng" className="admin-items-page bg-white">
    <Link href={backHref} className="mb-6 inline-block text-sm underline">{fromConsignment ? "← Danh sách mặt hàng của phiếu" : "← Danh sách mặt hàng"}</Link>
    <ItemWorkspace item={item} />
  </AdminPage>;
}
