import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { AdminPage, date, Pagination } from "@/components/admin/admin-ui";

const PAGE_SIZE = 20;
export default async function ConsignmentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const { page: rawPage } = await searchParams;
  const requested = Number(rawPage);
  const pageRequested = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const total = await prisma.consignment.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageRequested, totalPages);
  const consignments = await prisma.consignment.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    select: { id: true, publicCode: true, intakeType: true, createdAt: true, consignor: { select: { name: true } }, _count: { select: { items: true } } },
  });
  return <AdminPage title="Phiếu tiếp nhận"><p className="mb-4 text-sm text-neutral-600">{total} phiếu</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b bg-neutral-50"><th className="p-3">Mã phiếu</th><th className="p-3">Ngày nhận</th><th className="p-3">Loại tiếp nhận</th><th className="p-3">Khách gửi</th><th className="p-3">Số mặt hàng</th></tr></thead><tbody>
      {consignments.map((entry) => <tr key={entry.id} className="border-b"><td className="p-3"><Link href={`/admin/consignments/${entry.id}`} className="font-semibold underline">{entry.publicCode}</Link></td><td className="p-3">{date(entry.createdAt)}</td><td className="p-3">{entry.intakeType === "BUY" ? "Mua lại" : "Ký gửi"}</td><td className="p-3">{entry.consignor.name}</td><td className="p-3">{entry._count.items}</td></tr>)}
    </tbody></table>{consignments.length === 0 && <p className="p-6 text-center text-neutral-600">Chưa có phiếu nào.</p>}</div>
    <Pagination page={page} totalPages={totalPages} href={(next) => `/admin/consignments?page=${next}`} />
  </AdminPage>;
}
