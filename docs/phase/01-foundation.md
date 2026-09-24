# Phase 1 — Khảo sát và nền tảng

Thời lượng dự kiến: **1,5–2,5 ngày công**. Phụ thuộc: không có. Kế tiếp: [Phase 2](02-public-pages.md).

## Mục tiêu

Chốt baseline đủ chi tiết để **clone giao diện giống hệt (1:1)** năm trang tham chiếu, đồng thời khởi tạo Next.js/TypeScript/shadcn/ui và PostgreSQL.

## Công việc

- [ ] Khảo sát đủ năm trang tham chiếu ở desktop/mobile, gồm hai trạng thái online của `/consign` và `/buy`; lưu ảnh cùng URL, viewport, mức zoom, scroll position, trạng thái UI và thời điểm chụp vào `docs/reference/`.
- [ ] Ghi nhận font, cỡ chữ, line height, tracking, màu, kích thước khối, khoảng cách, viền, icon, ảnh, sticky, animation và breakpoint từ giao diện thực tế; xác định các ảnh/trạng thái cần so sau mỗi lần triển khai.
- [ ] Xác nhận quyền dùng thương hiệu, nội dung, hình ảnh và các liên kết ngoài; ghi nhận phần chưa xác minh, nhất là kết quả quyết toán.
- [ ] Chốt cấu hình ban đầu: hotline shop, chính sách tối thiểu số món ký gửi, trường/giới hạn ảnh, chính sách xử lý thông tin khách.
- [ ] Khởi tạo Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui, font tiếng Việt, tokens giao diện và layout chung.
- [ ] Tạo skeleton route công khai và admin, 404/error, cấu hình metadata, `.env.example` và scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`.
- [ ] Cấu hình PostgreSQL dev, ORM và migration; tạo schema cho `consignors`, `consignments`, `items`, `item_images`, `admin_users`, `item_status_events` theo [mô hình trong kế hoạch tổng](../implementation-plan.md).
- [ ] Tạo seed **giả** cho phát triển, tách biệt dữ liệu production; xác định cách chạy migration cho dev/staging.

## Đầu ra

- Repository ứng dụng khởi chạy được, các route khung mở trực tiếp được.
- Migration từ database trống chạy thành công và có thể seed dữ liệu giả.
- Bộ baseline desktop/mobile và trạng thái tương tác làm chuẩn bắt buộc để đối chiếu Phase 2 và Phase 5.
- Cấu hình runtime không đưa `DATABASE_URL` hoặc secret vào bundle client.

## Điều kiện hoàn thành

- [ ] `build`, lint và typecheck chạy sạch với skeleton.
- [ ] Migration chạy từ PostgreSQL trống; constraint, foreign key, index trạng thái và slug được định nghĩa.
- [ ] Không có thông tin khách thật trong seed hoặc tài liệu.
- [ ] Các giả định chưa chốt được liệt kê rõ để không biến thành quy tắc cứng trong mã.
- [ ] Có baseline cho cả năm trang và các trạng thái tab; chưa đủ baseline thì chưa kết luận giao diện đã clone 1:1.

Phase 1 chỉ tạo nền dữ liệu và cấu trúc; luồng ghi phiếu nằm ở Phase 3. Quy tắc kiểm thử thiết bị bằng ARTEMIS trong [kế hoạch tổng](../implementation-plan.md) áp dụng khi viết test mobile.
