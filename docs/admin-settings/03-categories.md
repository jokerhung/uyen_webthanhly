# Phase 3 — Danh sách loại sản phẩm

Phụ thuộc: Phase 1; thực hiện sau Phase 2. Ước lượng: 1–1,5 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/categories` quản lý bảng `ItemCategory` hiện có: thêm, xóa mềm và khôi phục loại sản phẩm.

## Công việc

- [x] Dựng component quản lý danh mục tái sử dụng: danh sách, tìm kiếm, trạng thái Đang dùng/Đã xóa, số mặt hàng tham chiếu, form Thêm, dialog xác nhận xóa, nút Khôi phục.
- [x] Thêm API `GET/POST /api/admin/settings/categories`; mutation xóa/khôi phục theo ID. Bảo vệ toàn bộ bằng session và kiểm tra cùng nguồn.
- [x] Tạo slug ở server; giữ nguyên slug cũ và quan hệ Item. Tên 1–100 ký tự, chống trùng theo quy tắc chuẩn hóa trong tổng quan.
- [x] Rà trùng dữ liệu cũ trước khi bổ sung normalizedName/unique constraint. Nếu trùng, báo rõ các bản ghi để xử lý; không tự chuyển Item sang loại khác.
- [x] Xóa đặt `active=false`, ghi audit. Hiển thị rõ số mặt hàng đang dùng và nhãn cũ vẫn được giữ; không xóa bản ghi vật lý.
- [x] Làm mới form ký gửi/thu mua, form thuộc tính admin và bộ lọc sản phẩm; API tiếp nhận/đăng bán kiểm tra lại active ở lần gửi.
- [x] Form có category cũ đã ngừng dùng phải hiện trạng thái đó và yêu cầu lựa chọn hợp lệ khi lưu; không tự thay bằng option đầu tiên.

## Đầu ra và nghiệm thu

- [x] Thêm loại mới → xuất hiện ở form gửi hàng/thu mua, biên tập hàng và bộ lọc khi tải trang mới (đã kiểm tra query form; chưa kiểm tra tất cả tương tác trình duyệt).
- [x] Xóa loại đã có mặt hàng → loại biến mất khỏi lựa chọn mới, hàng cũ vẫn đọc và hiển thị được.
- [x] Khôi phục giữ đúng slug và liên kết cũ; thêm trùng bản ghi đã xóa hướng dẫn khôi phục.
- [x] Hai request thêm cùng tên không tạo hai bản ghi; payload giả danh ID/kind không hợp lệ bị chặn.
- [ ] Component và service danh mục sẵn sàng dùng cho Phase 4–6: `CategoryManager` nhận endpoint/nhãn, nhưng Phase 4–6 phải xác nhận lại contract `ListingOption`, `kind` và tham chiếu trước khi tái dùng.

Migration `20261004000000_category_normalized_name` kiểm tra trùng theo lowercase/NFC/khoảng trắng; nếu có, nêu slug/tên cụ thể và dừng, không tự sửa Item. Trên DB local hiện tại và DB disposable migration đã chạy; PostgreSQL giữ UNIQUE trên `normalized_name` của cả bản ghi active/inactive, và CHECK ngăn giá trị không được chuẩn hóa. Trước staging/prod cần sao lưu DB/ảnh cùng thời điểm và thực hành restore; rollback code giữ cột/chỉ mục cùng lịch sử audit, không drop dữ liệu để “sửa” lỗi. API yêu cầu session/Origin và payload strict; slug tạo server và không đổi khi khôi phục. E2E trên DB disposable xác minh xóa/khôi phục giữ item, auth, chuẩn hóa và audit; chưa nghiệm thu staging hoặc thiết bị thật.
