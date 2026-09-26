# Phase 2 — Chữ chạy trang chủ

Phụ thuộc: Phase 1. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/announcement` cho thay nội dung chữ chạy và xem trước. Do `AnnouncementTicker` được dùng chung, thay đổi áp dụng ở trang chủ và các trang công khai đang dùng cùng thanh này.

## Công việc

- [ ] Bổ sung `announcementText`, `announcementEnabled` vào ShopSettings qua migration; khởi tạo nội dung đang chạy, giữ trạng thái hiện tại.
- [ ] Textarea nội dung, công tắc bật/tắt, preview và Lưu/Hủy. Chỉ nhận văn bản thuần, giới hạn 500 ký tự; không render HTML từ input.
- [ ] Khi bật, nội dung sau trim phải có ít nhất một ký tự; khi tắt, không để thanh rỗng vẫn chiếm chỗ.
- [ ] Endpoint/Server Action riêng cho announcement, chỉ cập nhật trường được phép; dùng version và audit của Phase 1.
- [ ] `AnnouncementTicker` đọc cấu hình DB; ngừng ghép tự động tên/địa chỉ/SĐT sau khi đã có nội dung riêng.
- [ ] Căn lại offset nội dung và nút back khi ẩn thanh; giữ `prefers-reduced-motion`, không đọc lặp nội dung cho screen reader.
- [ ] Revalidate toàn bộ các trang dùng ticker sau commit.

## Đầu ra và nghiệm thu

- [ ] Đổi nội dung, tải lại trang chủ thấy chữ mới; trang con dùng ticker cũng đồng bộ.
- [ ] Chữ tiếng Việt, nội dung ngắn/dài không làm tràn ngang viewport ngoài vùng ticker.
- [ ] Bật/tắt không tạo khoảng trống hoặc che nội dung/nút back trên mobile.
- [ ] Chuỗi HTML/script hiển thị như văn bản; lỗi validation không xóa cấu hình đang dùng.
