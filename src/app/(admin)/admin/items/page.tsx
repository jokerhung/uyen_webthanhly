import Link from "next/link";
import { IntakeType, ItemStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { activeItemStatuses, itemStatusLabels } from "@/lib/admin/item-status";
import { AdminPage, date, ItemThumbnail, money, Pagination, StatusBadge } from "@/components/admin/admin-ui";

const PAGE_SIZE = 20;
type Search = { status?: string; intakeType?: string; page?: string };

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = Object.values(ItemStatus).find((value) => value === params.status?.toUpperCase());
  const intakeType = Object.values(IntakeType).find((value) => value === params.intakeType?.toUpperCase());
  const parsedPage = Number(params.page);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const where: Prisma.ItemWhereInput = { ...(status ? { status } : {}), ...(intakeType ? { consignment: { intakeType } } : {}) };
  const total = await prisma.item.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const items = await prisma.item.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    select: { id: true, name: true, status: true, desiredPrice: true, salePrice: true, createdAt: true,
      consignment: { select: { publicCode: true, createdAt: true, intakeType: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { storageKey: true, altText: true } },
    },
  });
  const url = (nextPage: number) => {
    const q = new URLSearchParams();
    if (status) q.set("status", status.toLowerCase());
    if (intakeType) q.set("intakeType", intakeType.toLowerCase());
    q.set("page", String(nextPage));
    return `/admin/items?${q}`;
  };
  return <AdminPage title="Quản lý mặt hàng">
    <form className="mb-6 flex flex-wrap items-end gap-4" action="/admin/items" method="get">
      <label className="grid gap-1 text-sm">Trạng thái<select name="status" defaultValue={status?.toLowerCase() ?? ""} className="rounded border p-2">
        <option value="">Tất cả</option>{activeItemStatuses.map((value) => <option key={value} value={value.toLowerCase()}>{itemStatusLabels[value]}</option>)}
        {status && !activeItemStatuses.some(value => value === status) && <option value={status.toLowerCase()}>{itemStatusLabels[status]}</option>}
      </select></label>
      <label className="grid gap-1 text-sm">Loại tiếp nhận<select name="intakeType" defaultValue={intakeType?.toLowerCase() ?? ""} className="rounded border p-2">
        <option value="">Tất cả</option><option value="consign">Ký gửi</option><option value="buy">Mua lại</option>
      </select></label>
      <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">Lọc</button>
    </form>
    <p className="mb-4 text-sm text-neutral-600">{total} mặt hàng</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead><tr className="border-b bg-neutral-50"><th className="p-3">Ảnh</th><th className="p-3">Mặt hàng</th><th className="p-3">Mã phiếu</th><th className="p-3">Ngày nhận</th><th className="p-3">Giá mong muốn</th><th className="p-3">Giá bán</th><th className="p-3">Trạng thái</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id} className="border-b"><td className="p-3"><ItemThumbnail storageKey={item.images[0]?.storageKey} alt={item.images[0]?.altText ?? item.name} /></td><td className="p-3"><Link href={`/admin/items/${item.id}`} className="font-semibold underline">{item.name}</Link></td><td className="p-3">{item.consignment.publicCode}</td><td className="p-3">{date(item.consignment.createdAt)}</td><td className="p-3">{money(item.desiredPrice)}</td><td className="p-3">{money(item.salePrice)}</td><td className="p-3"><StatusBadge status={item.status} /></td></tr>)}
      </tbody></table>{items.length === 0 && <p className="p-6 text-center text-neutral-600">Không có mặt hàng phù hợp.</p>}</div>
    <Pagination page={page} totalPages={totalPages} href={url} />
  </AdminPage>;
}
