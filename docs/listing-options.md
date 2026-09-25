# Danh mục thông tin đăng bán

Khi chuyển trạng thái sang Đang bán, admin phải chọn đủ bảy combobox: giới tính, mùa, category, chất liệu, kích thước, nhãn hiệu và giá bán.

Giới tính lấy từ `listing_options` với `kind = gender`: Nam (`gender-male`), Nữ (`gender-female`), Unisex (`gender-unisex`). Migration `20261001000000_listing_gender` thêm khóa ngoại `items.gender_id` và ba lựa chọn này. Server bắt buộc kiểm tra ID còn hoạt động và đúng nhóm; dữ liệu cũ không tự gán giới tính.

- Category dùng bảng `item_categories`, chỉ lấy bản ghi `active = true`.
- Năm nhóm còn lại dùng `listing_options`, phân biệt bằng `kind`: `season`, `material`, `size`, `brand`, `price`. Mỗi bản ghi có ID, nhãn, thứ tự và cờ active; nhóm giá có `amount` theo VNĐ.
- Migration `20260930000000_listing_options` khởi tạo Hè/Đông và các lựa chọn mẫu về chất liệu, kích thước, nhãn hiệu, mức giá. Có thể bổ sung hoặc ngừng dùng bằng cách cập nhật bảng; hiện chưa có màn hình quản trị danh mục.
- Form chỉ gửi ID danh mục; API kiểm tra cả sáu lựa chọn còn hoạt động và đúng nhóm trong cùng transaction cập nhật mặt hàng/lịch sử. Giá bán lấy từ `amount` phía server, không nhận giá tiền tự nhập từ client.
- Item lưu các khóa ngoại `season_id`, `material_id`, `size_id`, `brand_id`, `price_option_id`; `sale_price` là giá chốt tại lúc chuyển trạng thái và không tự thay đổi khi bảng giá được chỉnh sửa sau đó.
- Các lựa chọn còn hoạt động đã lưu được chọn lại khi đăng bán lần sau. Danh mục ngừng dùng yêu cầu chọn lại.
- Migration giữ nguyên các mặt hàng cũ, các trường mới có thể null cho hàng chưa đăng bán hoặc hàng đăng bán trước thay đổi này. Mọi lần chuyển sang Đang bán qua API mới đều yêu cầu đủ thông tin; không tự điền thuộc tính chưa biết cho dữ liệu cũ.
- Quy tắc riêng của phiếu thu mua hiện có vẫn được giữ nguyên.

Kiểm tra: typecheck, lint và unit validation pass; đã kiểm tra trên trình duyệt đủ sáu combobox. Chưa chạy bài E2E ghi DB cho bộ thuộc tính mới trong phiên này.
