# H.U.N — Phase 1 foundation

Next.js 16 App Router / TypeScript strict / Tailwind CSS 4 / shadcn-compatible component setup / Prisma 6 / PostgreSQL 16. Đây chỉ là **khung Phase 1**: các trang công khai chưa được clone 1:1, admin chưa có xác thực, không nhận dữ liệu khách thật.

## Chạy local

Yêu cầu Node.js ≥20.9, npm, Docker. `npm install`, sao chép `.env.example` thành `.env` (chỉ dùng credential dev). Đặt `PORT=3000` (hoặc cổng khác, ví dụ `PORT=3100`) trong `.env`, sau đó chạy `docker compose up -d db`, `npm run db:migrate`, `npm run db:generate`, rồi `npm run dev`. Truy cập `http://localhost:<PORT>`. `npm run start` cũng đọc `PORT` từ `.env`; nếu không khai báo sẽ dùng cổng 3000. Đây là cổng web, không phải cổng PostgreSQL.

Seed giả tùy chọn: trong PowerShell chạy `$env:ALLOW_SYNTHETIC_SEED='1'; npm run db:seed`; chỉ chạy ở database dev, có thể chạy nhiều lần. Không chạy seed trên staging/production. Chi tiết migration và backup: [docs/database.md](docs/database.md). Staging/production phải cung cấp `DATABASE_URL` bằng secret server và chạy `npm run db:migrate` sau backup/kiểm tra SQL. **Không** cấu hình URL DB dưới tiền tố `NEXT_PUBLIC_`.

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`. Test e2e dùng Playwright Chromium (`npx playwright install chromium` nếu chưa có trình duyệt); chỉ là smoke test desktop, chưa phải test thiết bị di động. Route admin hiện **chưa được bảo vệ** và chỉ chứa placeholder, tuyệt đối không đưa dữ liệu thật hay triển khai public trước Phase 4. Các route hàng bán và ký gửi cũng chỉ là placeholder.

Baseline nguồn và quyết định chưa chốt nằm trong [docs/reference/README.md](docs/reference/README.md) và [plan](docs/implementation-plan.md). Cần chủ dự án phê duyệt hotline, quyền thương hiệu/tài nguyên, chính sách tối thiểu món, upload ảnh, consent/retention, liên kết ngoài và mẫu kết quả quyết toán trước khi bật luồng tương ứng. Không dùng số khách thật trong repository.
