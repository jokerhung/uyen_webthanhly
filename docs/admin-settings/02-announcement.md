# Phase 2 — Chữ chạy trang chủ

Phụ thuộc: Phase 1. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/announcement` cho thay nội dung chữ chạy và xem trước. Do `AnnouncementTicker` được dùng chung, thay đổi áp dụng ở trang chủ và các trang công khai đang dùng cùng thanh này.

## Công việc

- [x] Bổ sung `announcementText`, `announcementEnabled` vào ShopSettings qua migration; khởi tạo nội dung đang chạy, giữ trạng thái hiện tại.
- [x] Textarea nội dung, công tắc bật/tắt, preview và Lưu/Hủy. Chỉ nhận văn bản thuần, giới hạn 500 ký tự; không render HTML từ input.
- [x] Khi bật, nội dung sau trim phải có ít nhất một ký tự; khi tắt, không để thanh rỗng vẫn chiếm chỗ.
- [x] Endpoint/Server Action riêng cho announcement, chỉ cập nhật trường được phép; dùng version và audit của Phase 1.
- [x] `AnnouncementTicker` đọc cấu hình DB; ngừng ghép tự động tên/địa chỉ/SĐT sau khi đã có nội dung riêng.
- [x] Căn lại offset nội dung và nút back khi ẩn thanh; giữ `prefers-reduced-motion`, không đọc lặp nội dung cho screen reader.
- [x] Revalidate toàn bộ các trang dùng ticker sau commit.

## Đầu ra và nghiệm thu

- [x] Đổi nội dung, tải lại trang chủ thấy chữ mới; trang con dùng ticker cũng đồng bộ.
- [ ] Chữ tiếng Việt, nội dung ngắn/dài không làm tràn ngang viewport ngoài vùng ticker: CSS giới hạn vùng tràn, cần xác nhận riêng trên mobile/thiết bị thật.
- [ ] Bật/tắt không tạo khoảng trống hoặc che nội dung/nút back trên mobile: E2E xác minh offset ở viewport desktop/390px; vẫn cần kiểm tra trực quan trên thiết bị thật.
- [x] Chuỗi HTML/script hiển thị như văn bản; lỗi validation không xóa cấu hình đang dùng.

Migration `20261003000000_shop_announcement` chỉ thêm cột và khởi tạo bằng câu chữ chạy trước đây từ tên/địa chỉ/SĐT hiện có tại thời điểm deploy; không đổi tên shop/slogan đã sửa. Giữ migration và dữ liệu khi rollback code; nếu phải gỡ cột, sao lưu `shop_settings` và `admin_config_events` trước, vì audit không được mất. GET/PATCH riêng `/api/admin/settings/announcement` dùng quyền admin, Origin, Zod, version chia sẻ với cấu hình shop và audit transaction; chỉ chấp nhận ba trường `expectedVersion`, `announcementText`, `announcementEnabled`. Đã thử migration trên DB local và DB disposable, E2E ẩn/hiện/xung đột/script trên DB disposable; chưa nghiệm thu staging hoặc mobile vật lý.
