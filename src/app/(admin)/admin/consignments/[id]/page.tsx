import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { AdminPage, date, ItemThumbnail, money, StatusBadge } from "@/components/admin/admin-ui";

export default async function ConsignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const entry = await prisma.consignment.findUnique({ where: { id }, include: {
    consignor: { select: { name: true, phoneNormalized: true } },
    items: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
  } });
  if (!entry) notFound();
  return <AdminPage title={`Phiếu ${entry.publicCode}`}>
    <Link href="/admin/consignments" className="text-sm underline">← Danh sách phiếu</Link>
    <section className="my-6 rounded border p-5"><h2 className="mb-4 text-lg font-bold">Thông tin phiếu</h2><dl className="grid grid-cols-[max-content_1fr] gap-x-5 gap-y-3 text-sm"><dt>Ngày nhận</dt><dd>{date(entry.createdAt)}</dd><dt>Loại tiếp nhận</dt><dd>{entry.intakeType === "BUY" ? "Mua lại" : "Ký gửi"}</dd><dt>Khách gửi</dt><dd>{entry.consignor.name}</dd><dt>Số điện thoại</dt><dd>{entry.consignor.phoneNormalized}</dd><dt>Ghi chú</dt><dd className="whitespace-pre-wrap">{entry.note ?? "—"}</dd></dl></section>
    <h2 id="items" className="mb-4 text-lg font-bold">Mặt hàng ({entry.items.length})</h2>
    <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b bg-neutral-50"><th className="p-3">Ảnh</th><th className="p-3">Mặt hàng</th><th className="p-3">Giá mong muốn</th><th className="p-3">Giá bán</th><th className="p-3">Trạng thái</th></tr></thead><tbody>
      {entry.items.map((item) => <tr key={item.id} className="border-b"><td className="p-3"><ItemThumbnail storageKey={item.images[0]?.storageKey} alt={item.images[0]?.altText ?? item.name} /></td><td className="p-3"><Link className="font-semibold underline" href={`/admin/items/${item.id}?from=consignment`}>{item.name}</Link></td><td className="p-3">{money(item.desiredPrice)}</td><td className="p-3">{money(item.salePrice)}</td><td className="p-3"><StatusBadge status={item.status} /></td></tr>)}
    </tbody></table>{entry.items.length === 0 && <p className="p-6 text-center text-neutral-600">Phiếu chưa có mặt hàng.</p>}</div>
  </AdminPage>;
}
