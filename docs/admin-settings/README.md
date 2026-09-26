# Kế hoạch tab Cấu hình quản trị

Ngày lập: 26/09/2026. Trạng thái: Phase 1–3 đã triển khai local; Phase 4–6 chưa triển khai; chưa nghiệm thu staging. Kế hoạch gồm đúng **6 phase** tương ứng sáu yêu cầu; độc lập với năm phase xây website trước đây.

## Mục tiêu

Thêm tab **Cấu hình** cạnh Mặt hàng và Phiếu tiếp nhận, cho admin thay đổi nội dung cửa hàng và các danh mục chọn sẵn trực tiếp trên web. Dữ liệu lưu PostgreSQL, áp dụng sau khi lưu thành công, không cần sửa code hoặc khởi động lại server.

| Phase | Nội dung | Trang dự kiến | Ước lượng |
| --- | --- | --- | --- |
| [1 — Thông tin shop](01-shop-profile.md) | Tên, màu thương hiệu, địa chỉ, Facebook, SĐT, giờ hoạt động; nền tảng cấu hình | `/admin/settings/shop` | 1,5–2 ngày |
| [2 — Chữ chạy](02-announcement.md) | Nội dung thông báo chạy | `/admin/settings/announcement` | 0,5–1 ngày |
| [3 — Loại sản phẩm](03-categories.md) | Thêm/xóa loại sản phẩm | `/admin/settings/categories` | 1–1,5 ngày |
| [4 — Nhãn hiệu](04-brands.md) | Thêm/xóa nhãn hiệu | `/admin/settings/brands` | 0,5–1 ngày |
| [5 — Kích thước](05-sizes.md) | Thêm/xóa kích thước | `/admin/settings/sizes` | 0,5–1 ngày |
| [6 — Chất liệu](06-materials.md) | Thêm/xóa chất liệu, kiểm tra tổng hợp | `/admin/settings/materials` | 0,5–1 ngày |

Tổng: **4,5–7,5 ngày công**, một lập trình viên. Thứ tự 1 → 2 → 3 → 4 → 5 → 6; phase 4–6 tái sử dụng component và service danh mục từ phase 3.

## Hiện trạng đã kiểm tra

- `AdminNav` mới có Mặt hàng, Phiếu tiếp nhận và Đăng xuất.
- Thông tin shop nằm trong `src/content/brand.ts`, `site.ts`, `branches.ts`; tên/màu vẫn có nơi ghi trực tiếp trong JSX/CSS. SĐT có thể bị `.env` ghi đè.
- Chữ chạy trong `src/content/about.ts` được ghép từ tên, địa chỉ và SĐT.
- Loại sản phẩm dùng `ItemCategory`/`item_categories`: `slug`, `name`, `sortOrder`, `active` và quan hệ tới Item.
- Nhãn hiệu, kích thước, chất liệu dùng `ListingOption`/`listing_options`, phân nhóm `brand`, `size`, `material`; đã có `active`, `sortOrder` và khóa ngoại từ Item.
- Form và bộ lọc hiện đọc các danh mục đang hoạt động. Mặt hàng cũ vẫn cần đọc nhãn của bản ghi đã ngừng dùng.

## Quy ước dùng chung

### Điều hướng và quyền

- `/admin/settings` chuyển tới `/admin/settings/shop` sau khi xác thực; chưa đăng nhập chuyển `/admin/login`.
- Sáu mục cấu hình dùng link có URL riêng, hiển thị trạng thái active và cuộn ngang/xếp gọn trên mobile.
- Dùng quyền admin hiện có (`ADMIN`, `SUPER_ADMIN` có tài khoản hoạt động); kiểm tra session và quyền tại từng trang và mutation server. Không chỉ ẩn nút phía client.
- Mutation kiểm tra cùng nguồn, validate bằng Zod, báo lỗi theo trường và chặn submit lặp. Không cho sửa khóa chính, `kind` hoặc actor tùy ý qua payload.

### Thêm/xóa danh mục

- Nút **Xóa** có xác nhận và giải thích ảnh hưởng; thực hiện xóa mềm bằng `active=false` cho cả bản ghi đã dùng và chưa dùng.
- Không xóa Item, không làm mất nhãn của hàng cũ. Bản ghi đã xóa không xuất hiện trong lựa chọn mới hoặc bộ lọc công khai.
- Có bộ lọc Đang dùng/Đã xóa và thao tác Khôi phục để tránh tạo bản ghi trùng; khôi phục giữ nguyên ID/slug.
- Đang chỉnh mặt hàng có giá trị ngừng dùng: hiển thị giá trị cũ kèm nhãn “Đã ngừng dùng”, yêu cầu chọn lại khi lưu các thuộc tính. Không tự đổi sang giá trị đầu tiên.
- API từ chối giá trị inactive kể cả form đã mở trước khi admin xóa danh mục. Hàng đang bán dùng danh mục bị xóa vẫn tồn tại trong danh sách chung và chi tiết.
- Chuẩn hóa tên: trim, gộp khoảng trắng, Unicode NFC, so sánh không phân biệt hoa/thường nhưng giữ dấu tiếng Việt. Không gộp hai từ khác dấu.
- Unique ở DB cho tên loại sản phẩm và `(kind, normalizedLabel)` cho ListingOption, bao gồm bản ghi inactive. Kiểm tra trùng dữ liệu cũ trước migration; không tự gộp bản ghi đang được tham chiếu.
- ID/slug sinh ở server, bất biến. Sắp xếp mặc định `sortOrder`, rồi tên; chưa cần kéo thả sắp xếp hoặc trang sửa tên trong phạm vi này.

### Lưu dữ liệu và cập nhật giao diện

- Thêm `ShopSettings` singleton và `AdminConfigEvent`; service server dùng chung cho cấu hình, không đọc DB trực tiếp trong client.
- `AdminConfigEvent`: ID, adminId, action, entityType, entityId, before/after JSON tối thiểu, createdAt. Ghi cùng transaction với thay đổi; không ghi secrets.
- Dùng `version` tăng dần để chống ghi đè cấu hình khi hai admin cùng sửa; danh mục dùng điều kiện trạng thái hoặc version tương đương.
- Sau commit, revalidate các trang/component sử dụng dữ liệu: `/`, `/about`, `/consign`, `/buy`, `/items`, chi tiết hàng, form tiếp nhận và admin liên quan. Nội dung công khai cập nhật ở lần tải/điều hướng tiếp theo; form đang mở được server kiểm tra lại khi submit.
- Seed ban đầu lấy dữ liệu Besties hiện tại, idempotent và chỉ điền khi chưa tồn tại. Không ghi đè giá trị đã sửa mỗi lần deploy.
- Cấu hình thương hiệu trong DB là nguồn chính sau migration; biến môi trường chỉ giữ secrets và cấu hình kỹ thuật. Không còn `SHOP_PHONE` âm thầm ghi đè thay đổi trên UI.

## Phạm vi không bao gồm

Chưa thêm upload logo/ảnh bìa, quản lý mùa/giới tính/bảng giá, tùy chỉnh phí ký gửi, email, nội dung mô tả dài, lịch nghỉ theo ngày hoặc CMS toàn bộ website. Các tính năng này có thể mở rộng sau; giá bán vẫn nhập textbox theo nghiệp vụ hiện tại.

## Hoàn thành toàn bộ kế hoạch

- [ ] Sáu trang hoạt động và dữ liệu còn nguyên sau restart.
- [ ] Thông tin/màu/thông báo nhất quán trên website; không còn nội dung cũ bị hard-code ghi đè.
- [ ] Thêm/xóa/khôi phục bốn danh mục không làm hỏng hàng cũ và khóa ngoại.
- [ ] Người chưa đăng nhập không đọc/ghi cấu hình admin; xử lý đúng lỗi nhập liệu, xung đột và lỗi DB.
- [ ] Build, typecheck, lint; kiểm tra migration trên DB staging và các luồng chính đạt.
- [ ] Kiểm tra responsive, đặc biệt tab Cấu hình và form trên mobile. Nếu viết test thiết bị, tuân thủ quy trình ARTEMIS trong hướng dẫn dự án; không coi viewport giả lập là kiểm thử iPhone thật.
- [ ] Cập nhật tài liệu database và hướng dẫn vận hành/khôi phục cấu hình.
