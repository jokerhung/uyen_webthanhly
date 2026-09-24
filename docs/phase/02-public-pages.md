# Phase 2 — Trang công khai và quyết toán demo

Thời lượng dự kiến: **2,5–3,5 ngày công**. Phụ thuộc: [Phase 1](01-foundation.md). Kế tiếp: [Phase 3](03-online-consignment.md).

## Mục tiêu

**Clone giao diện giống hệt (1:1)** năm trang công khai đã khảo sát, gồm cả trạng thái tương tác và responsive; hoàn thiện tra cứu quyết toán ở chế độ demo. Từ trang ký gửi online, người dùng có đường dẫn rõ tới form sẽ được xây ở Phase 3.

## Công việc

- [ ] Dựng `/` với announcement, logo/hero, bốn link điều hướng và footer theo baseline.
- [ ] Dựng `/about`: giới thiệu, timeline, ba cơ sở, copy hotline và link ngoài đã được duyệt.
- [ ] Dựng `/consign`: biểu phí, tiêu chí, tab trực tiếp/online, quy trình theo từng tab; thêm CTA đến `/consign/submit` mà vẫn giữ nội dung tham chiếu phù hợp.
- [ ] Dựng `/buy`: thông báo thu mua, nhóm giá, tiêu chí và hai quy trình trực tiếp/online.
- [ ] Dựng `/sales`: form số điện thoại, validation, loading, success/empty/error trong adapter dữ liệu **giả**; hiển thị nhãn demo và số thử nghiệm giả.
- [ ] Hoàn thiện responsive, keyboard/focus và `prefers-reduced-motion` cho các trang này.
- [ ] Tách nội dung lặp thành config typed để hotline, địa chỉ và giờ làm việc có một nguồn.
- [ ] So ảnh từng trang với baseline Phase 1 ở cùng viewport/trạng thái; chỉnh layout, font, line wrap, màu, khoảng cách, border, icon và animation đến khi không còn sai khác nhìn thấy được chưa được duyệt.

## Đầu ra

- Năm route tham chiếu hoạt động với nội dung và tương tác đã xác nhận.
- Trang quyết toán demo có đủ trạng thái giao diện; không truy vấn backend của website tham chiếu.
- CTA ký gửi online dẫn đúng `/consign/submit`; Phase 3 sẽ làm form tại route này.

## Điều kiện hoàn thành

- [ ] Điều hướng, browser back/forward và refresh route hoạt động.
- [ ] Tab dịch vụ thay đúng số bước: ký gửi 4/5, thu mua 3/4; có thể dùng bằng bàn phím.
- [ ] Hotline copy đúng giá trị cấu hình và có phản hồi khi clipboard bị chặn.
- [ ] Form quyết toán demo không lưu SĐT nhập vào URL, localStorage hoặc log; sửa input sẽ xóa kết quả cũ.
- [ ] Cả năm trang được đối chiếu ảnh ở viewport desktop/mobile đã ghi trong baseline; giao diện giống hệt nguồn, không tràn ngang. Mọi khác biệt do tính năng mới có ghi chú và được duyệt.

Quyết toán từ dữ liệu thật là hạng mục sau năm phase, vì chưa có mẫu báo cáo và cơ chế xác thực được xác nhận.
