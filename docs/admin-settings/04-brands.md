# Phase 4 — Danh sách nhãn hiệu

Phụ thuộc: Phase 1 và Phase 3. Ước lượng: 0,5–1 ngày. [Tổng quan](README.md).

## Phạm vi

Trang `/admin/settings/brands` quản lý `ListingOption` có `kind=brand`: thêm, xóa mềm, khôi phục.

## Công việc

- [ ] Tái sử dụng giao diện danh mục Phase 3, hiển thị tên, trạng thái và số mặt hàng tham chiếu.
- [ ] Tạo endpoint/service cho `brands`, khóa cứng `kind=brand` ở server. Payload không được chuyển nhóm thành mùa, giới tính hoặc giá.
- [ ] Thêm tên nhãn hiệu 1–100 ký tự; ID sinh ở server, amount luôn null; chuẩn hóa và chống trùng trong cùng nhóm.
- [ ] Migration chuẩn hóa nhãn/unique `(kind, normalizedLabel)` sau khi kiểm tra các bản ghi hiện có; dùng chung cho các nhóm ListingOption ở phase tiếp theo.
- [ ] Xóa/khôi phục bằng active, giữ nguyên khóa ngoại `Item.brandId`, ghi audit theo actor.
- [ ] Cập nhật combobox thuộc tính admin, bộ lọc nhãn hiệu và tên nhãn trên card/chi tiết. Nhãn cũ inactive vẫn hiển thị cho hàng đã gán.

## Đầu ra và nghiệm thu

- [ ] Thêm một nhãn hiệu → chọn được khi chỉnh sửa/đăng bán, lọc được sản phẩm đã gán.
- [ ] Xóa nhãn hiệu đang dùng không làm mất sản phẩm hoặc tên nhãn hiệu trên card.
- [ ] Khôi phục sử dụng lại ID; tên trùng không phân biệt hoa/thường bị chặn.
- [ ] Endpoint brand không sửa/xóa được size/material bằng cách truyền ID khác nhóm.
