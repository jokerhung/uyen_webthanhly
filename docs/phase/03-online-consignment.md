# Phase 3 — Ký gửi online và lưu PostgreSQL

Thời lượng dự kiến: **2–3 ngày công**. Phụ thuộc: [Phase 1](01-foundation.md) và CTA từ [Phase 2](02-public-pages.md). Kế tiếp: [Phase 4](04-admin-review.md).

## Mục tiêu

Khách có thể gửi phiếu ký gửi trực tiếp trên web. Phiếu, nhiều mặt hàng và metadata ảnh được lưu bền vững; tất cả mặt hàng mới ở trạng thái `pending`.

## Luồng người dùng

1. Mở `/consign/submit`, nhập tên, SĐT liên hệ và thông tin từng mặt hàng: tên, loại, mô tả, tình trạng, giá mong muốn, ảnh.
2. Thêm/xóa mặt hàng, xem lỗi từng trường và đồng ý chính sách xử lý thông tin liên hệ trước khi gửi.
3. Sau khi server lưu thành công, xem mã phiếu ngẫu nhiên và thông báo **đang chờ admin duyệt**. Chưa có mặt hàng nào hiển thị ở `/items`.

## Công việc

- [ ] Hoàn thiện form nhiều mặt hàng, trạng thái gửi, thông báo lỗi và xác nhận kết quả.
- [ ] Xác thực ở server bằng schema; giới hạn số món/ảnh, loại file thực tế và dung lượng theo cấu hình được duyệt.
- [ ] Upload ảnh lên storage riêng, tạo bản tối ưu cho hàng đã duyệt; lưu `storage_key` và thứ tự ảnh trong PostgreSQL.
- [ ] Tạo `consignor`, `consignment`, `items` và `item_images` trong transaction; nếu DB lỗi thì dọn file mới upload hoặc đưa vào cơ chế dọn rác.
- [ ] Chống gửi lặp bằng khóa idempotency hoặc cơ chế tương đương; giới hạn tần suất để tránh spam.
- [ ] Trả về `public_code` khó đoán; không đưa ID nội bộ hay SĐT khách vào URL hoặc response công khai.
- [ ] Giữ ảnh và thông tin phiếu pending chỉ trong vùng có quyền phù hợp; tránh URL ảnh pending có thể liệt kê/đoán.

## Đầu ra

- `/consign/submit` và `POST /api/consignments` hoặc Server Action tương đương.
- Dữ liệu thật được ghi vào PostgreSQL của dự án; ảnh nằm ở storage, DB chứa metadata.
- Phiếu mới có các item `pending`, sẵn sàng cho admin duyệt ở Phase 4.

## Điều kiện hoàn thành

- [ ] Gửi phiếu hợp lệ tạo đúng số mặt hàng, ảnh và liên hệ trong DB; hiển thị mã phiếu.
- [ ] Dữ liệu sai hoặc file không hợp lệ bị từ chối mà không tạo phiếu dở dang.
- [ ] Gửi lặp và lỗi giữa upload/DB được xử lý nhất quán, không phát hành nhiều phiếu ngoài ý muốn.
- [ ] Người chưa đăng nhập không thể gán `approved`, `sale_price`, `reviewed_by` từ payload.
- [ ] Chưa mặt hàng pending nào xuất hiện trong truy vấn công khai.
