# PostgreSQL — local setup và vận hành Phase 5

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

The seed additionally refuses `NODE_ENV=production`. Do not run this fixture against staging or production.

## Admin provisioning

Sau migration, Phase 4 tạo tài khoản quản trị bằng `node scripts/provision-admin.mjs admin@example.com < password-file` trên máy vận hành tin cậy, với file mật khẩu tạm ≥12 ký tự chỉ operator đọc được; xóa an toàn file ngay sau chạy. Không truyền mật khẩu trong argument, environment hay Git; script từ chối ghi đè admin đã tồn tại. Mật khẩu được scrypt với salt riêng, session token ngẫu nhiên chỉ lưu SHA-256 ở `admin_sessions`, cookie HttpOnly/SameSite Lax/Secure khi production. `admin_login_rate_limits` giới hạn đăng nhập thất bại. Production cần HTTPS thực tế để cookie Secure hoạt động; thu hồi quyền bằng `active=false` và xóa sessions của tài khoản đó. Dọn phiên hết hạn và rate limit cũ theo lịch vận hành.

### Tài khoản thử nghiệm chỉ trên máy local

Theo yêu cầu kiểm thử, `node scripts/create-local-admin.mjs` tạo **một lần** tài khoản `admin` / `123456` trên đúng PostgreSQL `webkygui_dev` chạy tại `localhost` hoặc `127.0.0.1`; lệnh không thay đổi tài khoản có sẵn. Chỉ đăng nhập bằng tài khoản này khi Next.js chạy `NODE_ENV=development` trên cùng DB local. Production, preview build hoặc DB khác đều từ chối tên `admin` cả lúc đăng nhập lẫn xác thực session; không dùng tài khoản này cho dữ liệu thật hoặc expose dev server ra Internet. Tài khoản thật dùng script `provision-admin.mjs` và mật khẩu mạnh.

## Loại nghiệp vụ của phiếu

Migration `20260926000000_intake_type` tạo PostgreSQL enum `intake_type` (`consign`, `buy`) và cột `consignments.intake_type` không null. Mọi phiếu cũ được giữ là `consign` vì chỉ có luồng ký gửi trước migration. `/consign/submit` gửi `consign`, `/buy/submit` gửi `buy`; API bắt buộc kiểm tra enum và lưu trên phiếu trong transaction. Cả hai tạo mặt hàng `pending`; **phiếu thu mua chỉ là yêu cầu báo giá**, không có nghĩa shop đã đồng ý thu hoặc trả tiền. Quản trị Phase 4 không cho duyệt và xuất bản trực tiếp mặt hàng thuộc phiếu `buy`: loại phiếu này cần quy trình báo giá/thỏa thuận thu mua riêng chưa được định nghĩa. Danh mục công khai về sau phải lọc loại phiếu phù hợp.

## Item categories

`item_categories` is a database-managed list of `{slug, name, sort_order, active}`. Migration `20260925000000_item_categories` inserts starter choices (Áo, Quần, Váy / Đầm, Áo khoác, Giày / Dép, Túi / Ví, Phụ kiện, Khác), converts existing `items.category` display text to stable slugs, and adds a foreign key. Previously used free-text names not in the starter list are preserved as **inactive** `legacy-*` categories; they remain valid for existing records but are absent from the intake combobox. Check these legacy records and map them manually only after confirming their meaning. The server renders active choices from PostgreSQL and validates selected slugs against the same table at submission time. Do not delete categories referenced by items; set `active=false` instead. Add or rename categories through controlled database migrations or a protected admin interface (future phase), not client-side hard-coded options. The development-only seed keeps its sample items on stable slugs.

## Staging/production: migration, backup và restore

Đây là **runbook đề xuất, chưa có biên bản chứng minh backup/restore staging đã chạy thành công**. Trước bất kỳ migration dữ liệu thật: xác định đúng DB/cluster và cửa sổ bảo trì; sao lưu PostgreSQL (schema + dữ liệu) bằng `pg_dump`/cơ chế managed PostgreSQL tương đương, sao lưu **đồng bộ** volume `CONSIGNMENT_STORAGE_DIR` (ảnh không nằm trong DB), mã hóa và hạn chế người truy cập bản backup, lưu bản backup/manifest ở nơi tách khỏi host. Xác minh file/manifest và khả năng đọc bản sao; restore DB sang **staging riêng biệt, không dùng chung DB/volume production**, restore ảnh tương ứng vào volume private; kiểm tra số hàng/khóa ngoại, một số item và ảnh liên kết, quyền ảnh pending/admin, catalog chỉ hiện approved CONSIGN, và thực hành rollback. Không coi `pg_dump` thành công là restore đã được kiểm chứng. Ghi ngày, operator, phiên bản schema, kết quả và thời gian phục hồi vào biên bản vận hành riêng, không ghi thông tin khách vào repository.

Sau backup **đã được khôi phục thử**, review từng SQL trong `prisma/migrations/` và khả năng rollback (migrate deploy không tự hoàn tác), cấp `DATABASE_URL` từ secret server, chạy `npm run db:migrate` (`prisma migrate deploy`), `npm run db:generate`, build và smoke test. Không dùng seed giả, `prisma db push`, tài khoản `admin`/`123456` hoặc reset volume trên staging/production. Chỉ đổi traffic khi test lọc trạng thái, quyền ảnh, PII, HTTPS/session và đường gọi hotline shop đạt; nếu lỗi, dừng traffic và khôi phục từ DB **và** ảnh cùng mốc thời gian đã thử nghiệm, thay vì tự ý sửa bảng. Đường triển khai nhiều instance/ephemeral cần storage private dùng chung/object storage và cơ chế cleanup trước khi nhận upload; filesystem local đơn lẻ không đủ.

`CONSIGNMENT_STORAGE_DIR` phải ngoài `public/`, không expose bằng static hosting/CDN; filesystem mặc định `.private/consignments` chỉ là local. DB lưu `storage_key` riêng, không phải URL công khai. Admin đọc ảnh qua route đòi session; ảnh catalog approved CONSIGN đi qua `/api/items/[slug]/images/[imageId]` kiểm tra slug, image id và trạng thái ở mỗi request, không dùng khóa storage raw. Đảm bảo private/no-store cho route nhạy cảm và xác minh cache sau chuyển sold/hidden. Chính sách lưu/xóa ảnh khi reject, retention/consent, hạn mức upload và rate limit hợp lý vẫn chờ chủ dự án phê duyệt; xem [QA Phase 5](phase/05-qa-notes.md).

## Constraints, access and open decisions

The SQL migration creates the six planned tables, UUID keys, foreign keys, enum statuses (`pending`, `negotiating`, `received`, `approved`, `sold`, `settled`, `rejected`, `deleted`; `hidden` là trạng thái cũ), unique slugs/public codes, an index on `(status, published_at DESC)`, and a database `CHECK` requiring a positive `sale_price` for `approved`. Positive non-null sale prices and non-negative desired prices are also enforced. Prisma does not express SQL `CHECK` constraints in `schema.prisma`; retain them in reviewed migrations. `@updatedAt` fields are maintained by Prisma writes; raw SQL writers must set `updated_at` themselves. The database does not enforce transition rules or audit atomicity: admin mutations must use a transaction with current-status conditional update and status-event insert. Only `approved` items may be queried for public pages; never select consignor relations, private images or contact numbers for public responses. The public code for *new* receipts must be generated using a cryptographic random generator; the literal seed code is only a conspicuous fixture.

Before production, confirm minimum item count, phone normalization, image limits and storage access, retention/deletion and consent policy, actual shop phone, authentication provider, and approved status transitions. Do not hard-code those unresolved business rules into the migration. Images store storage keys only; image bytes belong in object storage with access controls.
