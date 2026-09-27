# Phase 6 — Danh sách chất liệu và nghiệm thu tổng hợp

Phụ thuộc: Phase 3–5. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/materials` quản lý `ListingOption` có `kind=material`: thêm, xóa mềm, khôi phục chất liệu; hoàn tất kiểm tra xuyên suốt sáu phase.

## Công việc

- [x] Tái sử dụng giao diện quản lý danh mục; thêm tên chất liệu 1–100 ký tự, hỗ trợ dấu tiếng Việt.
- [x] Server cố định nhóm material, amount null; kiểm tra trùng normalizedLabel trong cùng nhóm.
- [x] Xóa/khôi phục active, không thay đổi `Item.materialId` hoặc các lựa chọn mùa/giới tính/giá.
- [x] Làm mới combobox chất liệu và bộ lọc công khai; hiển thị tên chất liệu cũ trên hàng đã gán dù inactive.
- [ ] Chưa chạy E2E xuyên suốt sáu phase trong một phiên; đã chạy E2E chuyên biệt các nhóm Phase 4–6 và các phase trước. Kiểm tra luồng tổng: đổi thông tin shop → đổi chữ chạy → thêm danh mục → chọn thuộc tính mặt hàng → xem public → xóa danh mục → xác nhận dữ liệu cũ vẫn còn → khôi phục.
- [ ] Đã kiểm tra quyền, xung đột trạng thái và tên trùng qua E2E; chưa mô phỏng thêm trùng đồng thời, nhóm rỗng, form mở cũ hoặc DB mất kết nối.
- [ ] Migration đã kiểm tra trên DB local và DB disposable, build/typecheck/lint đạt; chưa kiểm tra staging, responsive bằng trình duyệt mobile hoặc thiết bị thật.
- [x] Cập nhật `docs/database.md`, README và hướng dẫn quản trị; mô tả backup/restore và seed không ghi đè. Không phát sinh biến môi trường mới.

## Đầu ra và nghiệm thu

- [x] Thêm/xóa/khôi phục chất liệu hoạt động, các danh mục khác không bị tác động.
- [x] Sáu mục cấu hình truy cập được từ tab Cấu hình, dữ liệu lưu PostgreSQL và giữ qua restart.
- [x] Thông tin public cập nhật sau lưu; không cần sửa code hoặc triển khai lại cho thao tác cấu hình thông thường.
- [x] Không mất Item, khóa ngoại, nhãn lịch sử hoặc dữ liệu cấu hình đã có.
- [ ] Cần hoàn tất QA staging, trình duyệt mobile/thiết bị thật và luồng tổng trước khi ký nghiệm thu toàn bộ checklist.
