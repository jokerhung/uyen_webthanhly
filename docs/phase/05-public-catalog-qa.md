# Phase 5 — Hàng đang bán, kiểm thử và bàn giao

Thời lượng dự kiến: **2,5–4 ngày công**. Phụ thuộc: [Phase 4](04-admin-review.md).

## Mục tiêu

Đưa mặt hàng đã được admin duyệt lên danh sách bán công khai; trang chi tiết dùng SĐT **shop** để liên hệ. Hoàn thiện kiểm thử, vận hành và bàn giao ứng dụng.

## Công việc

- [ ] Xây `/items` với ảnh đại diện, tên, giá bán, phân trang và empty state; chỉ query item `approved`.
- [ ] Xây `/items/[slug]` với ảnh, mô tả, tình trạng, giá, nút gọi `tel:` từ `SHOP_PHONE`; không trả tên/SĐT khách ký gửi.
- [ ] Thêm lối vào danh sách hàng bán từ trang chủ hoặc navigation, vẫn giữ bố cục thương hiệu đã duyệt.
- [ ] Làm mới cache sau khi admin duyệt, đánh dấu sold hoặc hidden. Với item không còn approved, chi tiết trả 404.
- [ ] Kiểm tra SEO/metadata, sitemap chỉ cho URL công khai hợp lệ, robots/noindex cho admin và preview.
- [ ] Chạy kiểm tra build, lint, typecheck, accessibility, responsive, visual comparison và luồng đầu cuối từ gửi phiếu → duyệt → hiển thị → sold/hidden.
- [ ] Rà soát lần cuối ảnh của năm trang tham chiếu so với baseline; sửa các sai khác nhìn thấy được xuất hiện khi tích hợp các tính năng mới.
- [ ] Xác nhận response, HTML, metadata và ảnh public không chứa thông tin khách ký gửi.
- [ ] Tài liệu hóa `.env`, migration, seed, tạo admin, backup/restore PostgreSQL, storage, chạy local và triển khai.

## Đầu ra

- Trang danh sách và chi tiết hàng đang bán hoạt động từ dữ liệu PostgreSQL.
- Bản build production và README vận hành; báo cáo kiểm thử và các giới hạn còn mở.

## Điều kiện hoàn thành

- [ ] Pending/rejected/sold/hidden không có trên danh sách hoặc chi tiết public; approved hiển thị sau duyệt.
- [ ] Khi admin chuyển approved sang sold/hidden, mặt hàng biến mất khỏi public theo quy tắc cache đã triển khai.
- [ ] Trang chi tiết hiển thị đúng SĐT shop, không lộ SĐT/tên khách trong HTML, response hay metadata.
- [ ] Các route hoạt động sau refresh; build, lint, typecheck và kiểm thử luồng chính đạt.
- [ ] Migration từ DB sạch và backup/restore trên staging được xác nhận; README đủ để người khác chạy dự án.
- [ ] Năm trang tham chiếu vẫn đạt mục tiêu clone giao diện giống hệt sau khi thêm form, admin và danh sách bán; các trang mới nhất quán với thiết kế nguồn.

Sau năm phase, tích hợp **quyết toán thật** chỉ bắt đầu khi có nguồn dữ liệu, mẫu báo cáo và cơ chế xác thực được duyệt. Phạm vi này không nằm trong ước lượng của năm phase.
