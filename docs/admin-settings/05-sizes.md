# Phase 5 — Danh sách kích thước

Phụ thuộc: Phase 3–4. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/sizes` quản lý `ListingOption` có `kind=size`: thêm, xóa mềm, khôi phục kích thước.

## Công việc

- [ ] Tái sử dụng giao diện và service danh mục, cố định nhóm size tại server.
- [ ] Chấp nhận nhãn chữ hoặc số như XS, M, Freesize, 36, 38; lưu dạng chuỗi, không ép thành số.
- [ ] Validate 1–100 ký tự, chuẩn hóa và kiểm tra trùng trong nhóm size; ID bất biến, amount null.
- [ ] Thêm vào cuối thứ tự hiện có; danh sách ổn định theo sortOrder và nhãn. Không áp đặt sắp xếp số cho mọi loại size.
- [ ] Xóa/khôi phục active, giữ `Item.sizeId` và tên kích thước của hàng cũ.
- [ ] Cập nhật combobox khi đăng bán/chỉnh sửa và bộ lọc kích thước công khai.

## Đầu ra và nghiệm thu

- [ ] Thêm được size chữ và size số; chọn và lưu đúng ID vào Item.
- [ ] Xóa size đang dùng không làm mất thông tin hàng cũ; size ngừng dùng không còn được gửi mới qua API.
- [ ] Khôi phục không tạo bản ghi mới; endpoint không tác động nhóm brand/material.
- [ ] Danh sách dài trên mobile có thể tìm kiếm và thao tác đầy đủ.
