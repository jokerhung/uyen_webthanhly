# Quy trình trạng thái mặt hàng

Khi chuyển sang Đang bán phải chọn đủ mùa, category, chất liệu, kích thước, nhãn hiệu và giá từ database. Xem [danh mục thông tin đăng bán](listing-options.md); quy tắc này thay cho việc nhập trực tiếp giá bán.

Quy trình hiện tại thay thế luồng duyệt/từ chối trước đây trong các tài liệu phase.

| Hiển thị | Prisma | PostgreSQL |
| --- | --- | --- |
| Vừa tiếp nhận | PENDING | pending |
| Đang đàm phán giá | NEGOTIATING | negotiating |
| Đã tiếp nhận | RECEIVED | received |
| Đang bán | APPROVED | approved |
| Đã bán | SOLD | sold |
| Đã quyết toán | SETTLED | settled |
| Từ chối | REJECTED | rejected |
| Đã xóa | DELETED | deleted |

Áp dụng cho cả ký gửi và thu mua. Combobox mặc định chọn trạng thái hiện tại và cho chuyển sang bất kỳ trạng thái nào trong tám trạng thái trên, trừ trạng thái hiện tại; cho phép chuyển tiến, lùi hoặc bỏ qua bước. Khi chọn Đang bán bắt buộc có giá bán dương. Admin xác nhận trước khi lưu; server từ chối chuyển sang chính trạng thái hiện tại và kiểm tra trạng thái kỳ vọng để tránh ghi đè khi có thao tác đồng thời. Mỗi lần chuyển có audit log. Đã quyết toán chỉ ghi nhận xác nhận của admin; không chuyển khoản tự động. Giá và thông tin duyệt trước đây được giữ khi chuyển lùi; việc hiển thị hàng bán phụ thuộc trạng thái hiện tại.

Mặt hàng mới vẫn lưu `pending`. `approved` giữ nguyên mã để tương thích dữ liệu đã đăng bán; chỉ trạng thái này đủ điều kiện xuất hiện trong danh sách hàng đang bán. `received`, `rejected` và `deleted` không công khai. `rejected` được sử dụng lại cho Từ chối; `hidden` chỉ giữ cho bản ghi/lịch sử cũ. Đã xóa là xóa mềm: không xóa bản ghi, ảnh hay lịch sử, vẫn xem/lọc được trong admin và khôi phục bằng cách đổi trạng thái. Ghi chú từ chối/xóa không bắt buộc.

Migration `20260929000000_item_deleted_status` bổ sung `deleted`, không đổi trạng thái các bản ghi hiện có.

Migration `20260928000000_item_workflow` bổ sung ba giá trị enum, không xóa hay chuyển nhầm dữ liệu cũ. Sau migration cần generate Prisma Client và khởi động lại server.
