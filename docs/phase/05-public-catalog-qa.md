# Phase 5 — Hàng đang bán, kiểm thử và bàn giao

Thời lượng dự kiến: **2,5–4 ngày công**. Phụ thuộc: [Phase 4](04-admin-review.md).

## Mục tiêu

Đưa mặt hàng `approved` **thuộc phiếu `consign`** lên danh sách bán công khai; trang chi tiết dùng SĐT **shop** để liên hệ. `buy` chỉ là yêu cầu báo giá, kể cả dữ liệu bị ép trạng thái approved cũng không công bố. Hoàn thiện kiểm thử, vận hành và bàn giao ứng dụng. Trạng thái bằng chứng, các cổng chưa chốt và hướng dẫn QA ở [05-qa-notes.md](05-qa-notes.md); không đánh dấu hoàn tất chỉ vì đã có checklist.

## Công việc

- [x] Xây `/items` với ảnh đại diện, tên, giá bán, phân trang và empty state; chỉ query item `approved` thuộc `consign`, render động/no-store để không lộ item sold/hidden từ cache.
- [x] Xây `/items/[slug]` với ảnh, mô tả, tình trạng, giá, nút gọi `tel:` từ `SHOP_PHONE` đã được duyệt; không trả tên/SĐT khách ký gửi; slug không còn hợp lệ trả 404.
- [x] Chỉ phát ảnh approved CONSIGN qua `/api/items/[slug]/images/[imageId]`, kiểm tra quyền theo item ở mỗi request; không tạo public URL trực tiếp cho `storage_key`, không dùng route admin làm ảnh public.
- [x] Thêm lối vào danh sách hàng bán từ trang chủ hoặc navigation, vẫn giữ bố cục thương hiệu đã duyệt.
- [x] Sau khi admin duyệt hoặc sold, kiểm tra catalog dynamic/no-store và ảnh tại request mới; trang chi tiết/ảnh item không còn eligible trả 404, kể cả sau refresh hoặc qua cache/proxy.
- [x] Kiểm tra SEO/metadata, sitemap chỉ cho URL công khai hợp lệ (approved CONSIGN), robots/noindex cho admin và môi trường preview; bảo vệ route nhạy cảm bằng authorization chứ không chỉ dựa vào robots.
- [ ] Chạy kiểm tra build, lint, typecheck, accessibility, responsive, visual comparison và luồng đầu cuối từ gửi phiếu → duyệt → hiển thị → sold/hidden.
- [ ] Rà soát lần cuối ảnh của năm trang tham chiếu so với baseline; sửa các sai khác nhìn thấy được xuất hiện khi tích hợp các tính năng mới.
- [x] Xác nhận response, HTML, metadata và ảnh public không chứa thông tin khách ký gửi.
- [x] Tài liệu hóa `.env`, migration, seed, tạo admin, backup/restore PostgreSQL, storage, chạy local và triển khai.

**Bằng chứng local:** build production thành công (còn 3 cảnh báo Turbopack về filesystem tracing của private image storage); lint/typecheck/23 unit test đạt; E2E desktop 23 đạt, 4 bỏ qua do gate riêng; bài E2E catalog trên DB PostgreSQL disposable đạt sau khi thử đầy đủ trạng thái, ảnh và transition `approved → sold`. DB và ảnh thử đã xóa. Chưa thực hiện so pixel 5 trang, audit WCAG đầy đủ, thiết bị thật hoặc backup/restore staging; hotline thật và production indexing vẫn cần phê duyệt.

## Đầu ra

- Trang danh sách và chi tiết hàng đang bán hoạt động từ dữ liệu PostgreSQL.
- Bản build production và README vận hành; báo cáo kiểm thử và các giới hạn còn mở.

## Điều kiện hoàn thành

- [x] Pending/rejected/sold/hidden không có trên danh sách hoặc chi tiết public; approved hiển thị sau duyệt.
- [x] Khi admin chuyển approved sang sold (hidden là trạng thái cũ chưa có action mới), mặt hàng biến mất khỏi public theo quy tắc cache đã triển khai.
- [x] Trang chi tiết hiển thị đúng SĐT shop thử nghiệm, không lộ SĐT/tên khách trong HTML, response hay metadata.
- [x] Các route hoạt động sau refresh; build, lint, typecheck và kiểm thử luồng chính đạt.
- [ ] Migration từ DB sạch và **backup/restore DB + ảnh trên staging tách biệt** được operator xác nhận bằng biên bản; tại thời điểm ghi chú này chưa có bằng chứng restore staging. README đủ để người khác chạy dự án.
- [ ] Năm trang tham chiếu được reviewer so pixel và duyệt sau khi thêm form, admin và danh sách bán; **chưa xác minh clone giống hệt**. Các trang mới nhất quán với thiết kế nguồn nhưng không có baseline 1:1.
- [ ] Chủ shop phê duyệt các chính sách và giới hạn ở [QA notes](05-qa-notes.md) trước khi bật nhận khách thật hoặc đưa production.

Sau năm phase, tích hợp **quyết toán thật** chỉ bắt đầu khi có nguồn dữ liệu, mẫu báo cáo và cơ chế xác thực được duyệt. Phạm vi này không nằm trong ước lượng của năm phase.
