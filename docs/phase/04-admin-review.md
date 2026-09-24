# Phase 4 — Admin xem và duyệt mặt hàng

Thời lượng dự kiến: **2–3 ngày công**. Phụ thuộc: [Phase 3](03-online-consignment.md). Kế tiếp: [Phase 5](05-public-catalog-qa.md).

## Mục tiêu

Admin có thể xem toàn bộ mặt hàng khách gửi cùng trạng thái, kiểm tra chi tiết và duyệt/từ chối **từng mặt hàng**. Thao tác duyệt đặt giá bán và ghi lịch sử; chỉ admin được đổi trạng thái.

## Công việc

- [ ] Xây `/admin/login`, session phía server, bảo vệ toàn bộ trang và mutation admin.
- [ ] Xây `/admin/items`: danh sách tất cả mặt hàng, ảnh đại diện, tên, mã phiếu, ngày gửi, giá mong muốn, giá bán và trạng thái; lọc/phân trang.
- [ ] Xây `/admin/items/[id]`: thông tin chi tiết mặt hàng và phiếu, ảnh, SĐT khách ký gửi chỉ trong vùng admin.
- [ ] Xây `/admin/consignments` và trang chi tiết để xem nhiều mặt hàng thuộc cùng phiếu.
- [ ] Thêm thao tác `pending → approved` với `sale_price > 0`, `pending → rejected` với lý do; sau khi đã duyệt, hỗ trợ `approved → sold` hoặc `approved → hidden`.
- [ ] Ghi `item_status_events` với actor/thời điểm/lý do; cập nhật item + event cùng transaction.
- [ ] Dùng điều kiện trạng thái hiện tại hoặc version để ngăn hai admin duyệt chồng; trả lỗi xung đột dễ hiểu và tải lại dữ liệu.
- [ ] Không cho client tự chỉ định role, actor hoặc trạng thái ngoài sơ đồ chuyển hợp lệ; kiểm tra session, quyền và CSRF tại mutation.

## Đầu ra

- Khu quản trị có danh sách mặt hàng và trạng thái theo đúng yêu cầu.
- API/Server Action duyệt và cập nhật trạng thái cùng audit log.
- Dữ liệu `approved` có `sale_price` và `published_at`, sẵn sàng lên trang bán ở Phase 5.

## Điều kiện hoàn thành

- [ ] Chưa đăng nhập không xem được trang, API hoặc SĐT khách ký gửi.
- [ ] Duyệt thiếu giá bán và từ chối thiếu lý do bị chặn ở server.
- [ ] Một mặt hàng approved có giá bán, người duyệt, thời gian duyệt và event tương ứng.
- [ ] Các chuyển trạng thái không hợp lệ và thao tác đồng thời không làm sai dữ liệu.
- [ ] Danh sách admin lọc đúng `pending`, `approved`, `rejected`, `sold`, `hidden` và mở đúng chi tiết.
