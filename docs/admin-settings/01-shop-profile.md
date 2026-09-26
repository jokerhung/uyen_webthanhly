# Phase 1 — Thông tin shop và nền tảng cấu hình

Phụ thuộc: không có. Ước lượng: 1,5–2 ngày. [Tổng quan](README.md).

## Phạm vi

Thêm tab Cấu hình và trang `/admin/settings/shop`, gồm tên shop, màu thương hiệu, địa chỉ, link Facebook, số điện thoại, giờ mở/đóng cửa.

## Công việc

- [x] Thêm link Cấu hình trong `AdminNav`, layout sáu mục con và redirect `/admin/settings`.
- [x] Migration `ShopSettings`: `id=1`, `shopName`, `primaryColor`, `backgroundColor`, `surfaceColor`, `address`, `facebookUrl`, `phone`, `opensAt`, `closesAt`, `version`, `updatedAt`, `updatedById`. Chỉ một bản ghi, có constraint singleton.
- [x] Tạo bảng lịch sử `AdminConfigEvent` và lớp service đọc/lưu cấu hình theo quy tắc chung.
- [x] Seed từ Besties Club hiện tại: tông nâu/kem, địa chỉ 12 Phan Văn Trị, số 0986489942, fanpage hiện có, giờ 09:00–22:00. Không ghi đè bản ghi đã có.
- [x] Form có xem trước màu bằng color picker + textbox hex; mỗi trường có label, lỗi và nút Lưu/Hủy thay đổi. Màu mặc định hiện rõ, không thêm field không có tác dụng.
- [x] Validate tên 1–120 ký tự; địa chỉ 1–500; SĐT chuẩn hóa; URL HTTPS Facebook hợp lệ không chứa credentials hoặc scheme tùy ý; màu chỉ `#RRGGBB`.
- [x] Giờ dạng `HH:mm`; một khung giờ dùng hằng ngày. Nếu giờ đóng nhỏ hơn giờ mở, hiển thị rõ “ngày hôm sau”; giờ trùng nhau bị từ chối để tránh hiểu nhầm 24h.
- [x] `GET/PATCH /api/admin/settings/shop` hoặc Server Action tương đương, yêu cầu admin; gửi expectedVersion và trả 409 khi xung đột.
- [x] Thay hard-code tên và liên hệ tại trang chủ, giới thiệu, footer, dịch vụ, metadata, quản trị và nút Facebook/Zalo; Zalo dùng số shop đã chuẩn hóa. Không đổi mã phiếu cũ hoặc nội dung do khách nhập.
- [ ] Chuyển màu thương hiệu sang CSS variables được truyền từ server ở root layout (đã làm); tiếp tục rà soát toàn bộ utility/màu cứng, contrast trong trường hợp phối màu cực đoan và mobile.
- [x] Tách cấu hình kỹ thuật trong `getSiteConfig()` khỏi cấu hình shop; gỡ ưu tiên ghi đè từ `SHOP_PHONE` sau khi import giá trị ban đầu.

## Đầu ra và nghiệm thu

- [ ] Lưu shop mới, tải lại trang và restart vẫn thấy dữ liệu mới trên staging (local DB thử riêng đã xác minh sau request mới; chưa kiểm tra restart staging).
- [x] Footer, trang giới thiệu, metadata và liên hệ sản phẩm thống nhất với DB.
- [ ] Màu chính/nền/bề mặt tác động đúng nơi trên desktop/mobile; preview có kiểm tra độ tương phản nhưng chưa đối chiếu pixel/toàn bộ màn hình và thiết bị thật.
- [x] Sai URL, hex, giờ hoặc SĐT bị chặn ở server; thao tác thiếu quyền không ghi DB.
- [x] Lưu đồng thời không ghi đè âm thầm, có audit log và migration rollback được mô tả.

Migration `20260930000000_shop_settings` đã chạy trên DB local và DB disposable sạch; rollback không dùng `prisma db push`: backup PostgreSQL bao gồm `shop_settings` + `admin_config_events` trước khi deploy; nếu cần rollback code, giữ hai bảng và dữ liệu để deploy lại, chỉ drop chúng sau khi đã xác minh không còn client sử dụng và đã khôi phục backup (drop làm mất lịch sử audit). Kiểm thử local trên DB disposable xác minh lỗi 401/403/422, ghi version/audit và public UI sau request mới; chưa nghiệm thu staging, so pixel và thiết bị thật. Bảng đã seed Besties mặc định không bị ghi đè khi migrate lại. Chỉ chấp nhận màu có độ tương phản phù hợp sau khi người vận hành xem preview; nhiều stylesheet cũ dùng màu trung tính/báo lỗi độc lập chủ đề.

Chữ chạy tùy chỉnh được hoàn thiện trong Phase 2; nội dung dài không thuộc phạm vi Phase 1, nhưng tên/địa chỉ được chèn trong câu phải dùng cấu hình mới.
