// Development-only synthetic fixture. Never run against production data.
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, ItemStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SYNTHETIC_SEED !== '1') {
    throw new Error('Synthetic seed is dev-only; set ALLOW_SYNTHETIC_SEED=1 in a non-production environment.');
  }

  await prisma.$transaction(async (tx) => {
    const consignor = await tx.consignor.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Khách hàng mô phỏng',
        phoneNormalized: '0000000000', // Deliberately non-contactable placeholder, not a customer number.
      },
    });

    const consignment = await tx.consignment.upsert({
      where: { publicCode: 'DEMO-ONLY-NOT-A-REAL-RECEIPT' },
      update: {},
      create: {
        publicCode: 'DEMO-ONLY-NOT-A-REAL-RECEIPT',
        consignorId: consignor.id,
        note: 'Dữ liệu mô phỏng phục vụ phát triển; không phải phiếu thực.',
      },
    });

    await tx.item.upsert({
      where: { slug: 'demo-ao-khoac-gia' },
      update: {},
      create: {
        consignmentId: consignment.id,
        slug: 'demo-ao-khoac-gia',
        name: 'Áo khoác mẫu (giả)',
        category: 'Áo khoác',
        description: 'Sản phẩm mô phỏng để thử luồng chờ duyệt.',
        condition: 'Mô phỏng',
        desiredPrice: 150000,
        status: ItemStatus.PENDING,
      },
    });

    // An approved fixture exercises the catalog price constraint without creating a login.
    await tx.item.upsert({
      where: { slug: 'demo-tui-vai-gia' },
      update: {},
      create: {
        consignmentId: consignment.id,
        slug: 'demo-tui-vai-gia',
        name: 'Túi vải mẫu (giả)',
        category: 'Phụ kiện',
        description: 'Sản phẩm mô phỏng; không có ảnh hay liên hệ khách hàng thật.',
        condition: 'Mô phỏng',
        desiredPrice: 70000,
        salePrice: 90000,
        status: ItemStatus.APPROVED,
        publishedAt: new Date('2026-09-23T00:00:00.000Z'),
      },
    });
  });
  console.log('Synthetic development fixtures ready (idempotent).');
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
