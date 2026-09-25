# H.U.N — website ký gửi (Phase 5 đang triển khai)

Next.js 16 App Router / TypeScript strict / Tailwind CSS 4 / Prisma 6 / PostgreSQL 16. Trang hàng bán công khai và QA Phase 5 đang được tích hợp; **không coi đây là bản production đã nghiệm thu**. Quyết toán vẫn dùng adapter/fixture demo, không phải dữ liệu quyết toán thật. Xem [giới hạn QA Phase 5](docs/phase/05-qa-notes.md) trước khi triển khai.

## Chạy local

Cần Node.js ≥20.9, npm và Docker. Từ thư mục gốc dự án:

```sh
npm install
# sao chép .env.example thành .env; chỉ dùng credential dev
# trong .env đặt PORT=3000 (hoặc cổng chưa dùng) và DATABASE_URL cho DB local
docker compose up -d db
npm run db:migrate
npm run db:generate
npm run dev
```

Mở `http://localhost:<PORT>`. `npm run dev` và `npm run start` đọc `PORT` từ `.env` (mặc định 3000); đây là cổng web, không phải cổng PostgreSQL. Để chạy build production **local**, chạy `npm run build` rồi `npm run start`, sau khi đã cấu hình DB và migration. Không expose development server hay tài khoản thử nghiệm ra Internet.

Seed fixture **chỉ trên DB dev có thể xóa**, sau migration/generate: PowerShell `$env:ALLOW_SYNTHETIC_SEED='1'; npm run db:seed`; POSIX `ALLOW_SYNTHETIC_SEED=1 npm run db:seed`. Không seed staging/production. Seed không tạo admin. Nếu cần tài khoản admin thật, thực hiện [quy trình provision](docs/database.md#admin-provisioning) với mật khẩu mạnh qua stdin; tài khoản `admin`/`123456` trong hướng dẫn DB chỉ được phép trên localhost DB development, không dùng trên preview/production.

## Cấu hình và vận hành

`.env.example` liệt kê các khóa: `DATABASE_URL` và `CONSIGNMENT_STORAGE_DIR` **chỉ ở server**, `PORT`, `SHOP_PHONE`, `MIN_CONSIGNMENT_ITEMS`, `MAX_CONSIGNMENT_ITEMS`, `MAX_IMAGES_PER_ITEM`, `MAX_IMAGE_BYTES`, `PRIVACY_POLICY_REVIEWED`, `SITE_URL`, `PUBLIC_INDEXING_ENABLED`. Chỉ bật indexing khi `SITE_URL` là origin HTTPS production đã xác minh và `PUBLIC_INDEXING_ENABLED=true`; preview/local vẫn noindex. Không đưa URL DB, storage key, PII hoặc secret vào `NEXT_PUBLIC_`, Git, log hay trang public. Đặt `CONSIGNMENT_STORAGE_DIR` vào volume private bền vững, ngoài `public/`, có quyền truy cập hạn chế và backup cùng DB; fallback `.private/consignments` chỉ dành cho local. Pending/rejected/sold/hidden và ảnh của chúng không được công bố; với approved thuộc phiếu `consign`, ảnh public chỉ được phục vụ qua endpoint kiểm tra trạng thái `/api/items/[slug]/images/[imageId]`, không dùng URL file/storage key hoặc route ảnh admin. Không đẩy thư mục ảnh lên CDN/static public một cách trực tiếp.

Với staging/production: cấp `DATABASE_URL` bằng secret server và PostgreSQL riêng, xác nhận nơi lưu ảnh bền vững, backup DB **và ảnh**; kiểm tra khả năng khôi phục trên staging tách biệt **trước** thay đổi dữ liệu thật; review SQL đã commit, chạy `npm run db:migrate`, `npm run db:generate`, `npm run build`, sau đó `npm run start` sau HTTPS/reverse proxy phù hợp. Không chạy `prisma db push` trên staging/production. Đây là trình tự cần thực hiện, **chưa phải bằng chứng restore staging đã thành công**; xem [runbook DB](docs/database.md) và [QA notes](docs/phase/05-qa-notes.md).

`SHOP_PHONE` phải là hotline shop được phê duyệt trước khi bật nút gọi hàng bán; tuyệt đối không thay bằng SĐT người ký gửi. Việc bật nhận phiếu thật cần chủ dự án duyệt chính sách dữ liệu/consent/retention, hạn mức số món và ảnh, nơi lưu/backup, rate limiting và hotline; giữ `PRIVACY_POLICY_REVIEWED=false` cho tới lúc đó. Cần duyệt quyền sử dụng thương hiệu/ảnh và liên kết ngoài. Phiếu `buy` chỉ là yêu cầu báo giá, **không** được duyệt thẳng lên catalog. Xem [gates và trạng thái chưa xác minh](docs/phase/05-qa-notes.md) và [Phase 3](docs/phase/03-qa-notes.md).

## Kiểm thử

`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e` (cài Chromium nếu cần: `npx playwright install chromium`). E2E mặc định dùng Desktop Chrome; test DB ghi thật chỉ chạy trên DB disposable theo hướng dẫn Phase 3. Kiểm tra riêng public catalog sau duyệt/ẩn/bán, ảnh public, SEO và leak PII như [checklist Phase 5](docs/phase/05-public-catalog-qa.md). Ảnh baseline của năm trang gốc ở [docs/reference/README.md](docs/reference/README.md) chưa được đối chiếu pixel bởi reviewer; không tuyên bố clone 1:1 hoặc test mobile thiết bị thật đã đạt.
