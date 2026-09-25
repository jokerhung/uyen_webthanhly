# PostgreSQL development database (Phase 1)

The database is for online consignments, item moderation, and the public item catalog. Settlement lookup remains a separate demo adapter; this schema does not represent real settlement records. Prisma **6.x** is intended (`prisma` and `@prisma/client` at matching 6.x versions); `DATABASE_URL` is read only on the server. Do not prefix it with `NEXT_PUBLIC_`.

## Local setup

Install project dependencies as provided by the application maintainer (this database handoff does not change `package.json`). Start the local PostgreSQL 16 database:

```sh
docker compose up -d db
```

Set this **development-only** connection string in your local `.env` (do not commit real credentials):

```dotenv
DATABASE_URL="postgresql://webkygui:dev_only_change_me@127.0.0.1:5432/webkygui_dev?schema=public"
```

If port 5432 is occupied, alter the *host-side* compose port and this URL together. The compose password is intentionally a local development placeholder and must not be used for staging or production. PostgreSQL data persists in the named `postgres_dev_data` volume; `docker compose down -v` **destroys** local data.

## Migrations and seed

From the repository root with matching Prisma 6.x dependencies installed:

```sh
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

`migrate deploy` applies the checked-in SQL to a clean or existing database without creating new migrations. During schema development, edit `prisma/schema.prisma` and use `npx prisma migrate dev --name descriptive_change` to create a reviewed, committed migration. Never use `prisma db push` to alter staging/production or edit production tables by hand. On staging/production, back up data first, review SQL, and run `npx prisma migrate deploy` using a server-side environment secret. Test backup/restore before applying real-data changes.

Seed is deliberately opt-in and development-only, uses non-contactable placeholder contact data, and is idempotent (upserts keyed by fixture identity/slug). It does **not** create an admin login or a real receipt. Run it only against a disposable development database:

```sh
# POSIX shells
ALLOW_SYNTHETIC_SEED=1 node prisma/seed.cjs
# PowerShell
$env:ALLOW_SYNTHETIC_SEED='1'; node prisma/seed.cjs
```

The seed additionally refuses `NODE_ENV=production`. Do not run this fixture against staging or production. Configure a real admin identity through a separate, secure provisioning process; never commit a password hash copied from a real user. `admin_users` requires either a password hash or a provider subject, but Phase 1 does not implement authentication/session handling.

## Loại nghiệp vụ của phiếu

Migration `20260926000000_intake_type` tạo PostgreSQL enum `intake_type` (`consign`, `buy`) và cột `consignments.intake_type` không null. Mọi phiếu cũ được giữ là `consign` vì chỉ có luồng ký gửi trước migration. `/consign/submit` gửi `consign`, `/buy/submit` gửi `buy`; API bắt buộc kiểm tra enum và lưu trên phiếu trong transaction. Cả hai tạo mặt hàng `pending`; **phiếu thu mua chỉ là yêu cầu báo giá**, không có nghĩa shop đã đồng ý thu hoặc trả tiền. Khi xây quản trị/danh sách hàng bán, phải lọc loại phiếu phù hợp; không tự xuất bản mặt hàng của phiếu thu mua như hàng ký gửi đã duyệt.

## Item categories

`item_categories` is a database-managed list of `{slug, name, sort_order, active}`. Migration `20260925000000_item_categories` inserts starter choices (Áo, Quần, Váy / Đầm, Áo khoác, Giày / Dép, Túi / Ví, Phụ kiện, Khác), converts existing `items.category` display text to stable slugs, and adds a foreign key. Previously used free-text names not in the starter list are preserved as **inactive** `legacy-*` categories; they remain valid for existing records but are absent from the intake combobox. Check these legacy records and map them manually only after confirming their meaning. The server renders active choices from PostgreSQL and validates selected slugs against the same table at submission time. Do not delete categories referenced by items; set `active=false` instead. Add or rename categories through controlled database migrations or a protected admin interface (future phase), not client-side hard-coded options. The development-only seed keeps its sample items on stable slugs.

## Constraints, access and open decisions

The SQL migration creates the six planned tables, UUID keys, foreign keys, enum statuses (`pending`, `approved`, `rejected`, `sold`, `hidden`), unique slugs/public codes, an index on `(status, published_at DESC)`, and a database `CHECK` requiring a positive `sale_price` for `approved`. Positive non-null sale prices and non-negative desired prices are also enforced. Prisma does not express SQL `CHECK` constraints in `schema.prisma`; retain them in reviewed migrations. `@updatedAt` fields are maintained by Prisma writes; raw SQL writers must set `updated_at` themselves. The database does not enforce transition rules or audit atomicity: admin mutations must use a transaction with current-status conditional update and status-event insert. Only `approved` items may be queried for public pages; never select consignor relations, private images or contact numbers for public responses. The public code for *new* receipts must be generated using a cryptographic random generator; the literal seed code is only a conspicuous fixture.

Before production, confirm minimum item count, phone normalization, image limits and storage access, retention/deletion and consent policy, actual shop phone, authentication provider, and approved status transitions. Do not hard-code those unresolved business rules into the migration. Images store storage keys only; image bytes belong in object storage with access controls.
