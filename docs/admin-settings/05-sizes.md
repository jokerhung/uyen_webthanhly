# Phase 5 — Danh sách kích thước

Phụ thuộc: Phase 3–4. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/sizes` quản lý `ListingOption` có `kind=size`: thêm, xóa mềm, khôi phục kích thước.

## Công việc

- [x] Tái sử dụng giao diện và service danh mục, cố định nhóm size tại server.
- [x] Chấp nhận nhãn chữ hoặc số như XS, M, Freesize, 36, 38; lưu dạng chuỗi, không ép thành số.
- [x] Validate 1–100 ký tự, chuẩn hóa và kiểm tra trùng trong nhóm size; ID bất biến, amount null.
- [x] Thêm vào cuối thứ tự hiện có; danh sách ổn định theo sortOrder và nhãn. Không áp đặt sắp xếp số cho mọi loại size.
- [x] Xóa/khôi phục active, giữ `Item.sizeId` và tên kích thước của hàng cũ.
- [x] Cập nhật combobox khi đăng bán/chỉnh sửa và bộ lọc kích thước công khai.

## Đầu ra và nghiệm thu

- [x] Thêm được size chữ và size số; chọn và lưu đúng ID vào Item.
- [x] Xóa size đang dùng không làm mất thông tin hàng cũ; size ngừng dùng không còn được gửi mới qua API.
- [x] Khôi phục không tạo bản ghi mới; endpoint không tác động nhóm brand/material.
- [x] Danh sách dài trên mobile có thể tìm kiếm và thao tác đầy đủ.
