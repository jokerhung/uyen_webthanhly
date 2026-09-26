# Phase 6 — Danh sách chất liệu và nghiệm thu tổng hợp

Phụ thuộc: Phase 3–5. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/materials` quản lý `ListingOption` có `kind=material`: thêm, xóa mềm, khôi phục chất liệu; hoàn tất kiểm tra xuyên suốt sáu phase.

## Công việc

- [ ] Tái sử dụng giao diện quản lý danh mục; thêm tên chất liệu 1–100 ký tự, hỗ trợ dấu tiếng Việt.
- [ ] Server cố định nhóm material, amount null; kiểm tra trùng normalizedLabel trong cùng nhóm.
- [ ] Xóa/khôi phục active, không thay đổi `Item.materialId` hoặc các lựa chọn mùa/giới tính/giá.
- [ ] Làm mới combobox chất liệu và bộ lọc công khai; hiển thị tên chất liệu cũ trên hàng đã gán dù inactive.
- [ ] Kiểm tra luồng tổng: đổi thông tin shop → đổi chữ chạy → thêm danh mục → chọn thuộc tính mặt hàng → xem public → xóa danh mục → xác nhận dữ liệu cũ vẫn còn → khôi phục.
- [ ] Kiểm tra quyền, xung đột phiên bản, thêm trùng đồng thời, danh mục hết dữ liệu, form cũ gửi giá trị vừa bị xóa, lỗi kết nối DB.
- [ ] Kiểm tra migration trên staging, build/typecheck/lint và responsive của cả sáu trang. Ghi rõ những bài chưa chạy, đặc biệt thiết bị thật.
- [ ] Cập nhật `docs/database.md`, hướng dẫn quản trị và cấu hình môi trường; mô tả backup/restore và seed không ghi đè.

## Đầu ra và nghiệm thu

- [ ] Thêm/xóa/khôi phục chất liệu hoạt động, các danh mục khác không bị tác động.
- [ ] Sáu mục cấu hình truy cập được từ tab Cấu hình, dữ liệu lưu PostgreSQL và giữ qua restart.
- [ ] Thông tin public cập nhật sau lưu; không cần sửa code hoặc triển khai lại cho thao tác cấu hình thông thường.
- [ ] Không mất Item, khóa ngoại, nhãn lịch sử hoặc dữ liệu cấu hình đã có.
- [ ] Hoàn thành checklist tổng quan và bàn giao hướng dẫn sử dụng.
