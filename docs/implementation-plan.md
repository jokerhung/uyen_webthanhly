# Kế hoạch clone website H.U.N

Ngày khảo sát: 23/09/2026. Cập nhật nghiệp vụ: 23/09/2026. Trạng thái: kế hoạch triển khai, chưa viết mã ứng dụng.

## 1. Mục tiêu và phạm vi

Xây dựng website tiếng Việt bằng **Next.js App Router + TypeScript + shadcn/ui** với mục tiêu **clone giao diện giống hệt (1:1)** năm trang công khai đã quan sát trên [hunthanhlykygui.com](https://hunthanhlykygui.com/): bố cục, nội dung, font, kích thước chữ, màu sắc, khoảng cách, viền, ảnh, hiệu ứng và trạng thái tương tác.

Độ giống giao diện là **tiêu chí nghiệm thu bắt buộc**, không chỉ là định hướng thẩm mỹ. Phải so sánh ảnh chụp của bản clone với website tham chiếu ở cùng viewport và trạng thái, sửa các khác biệt nhìn thấy được trước khi coi một trang là hoàn thành. Theo yêu cầu bổ sung của chủ dự án, xây thêm luồng ký gửi online, quản trị và danh sách hàng bán; các trang mới áp dụng cùng ngôn ngữ thiết kế vì không có trang gốc tương ứng để clone 1:1. Chưa triển khai giỏ hàng hay checkout.

### Phạm vi triển khai

- Năm route tham chiếu: `/`, `/about`, `/consign`, `/buy`, `/sales`; thêm trang gửi hàng, danh sách hàng bán, chi tiết hàng và khu quản trị.
- Clone giao diện desktop và mobile theo ảnh tham chiếu đã chụp; giữ đúng cấu trúc, tỷ lệ, typography, màu, khoảng trắng, trạng thái hover/active và hành vi responsive.
- Chuyển chế độ trực tiếp/online, sao chép hotline, liên kết liên hệ và điều hướng.
- Khách gửi phiếu ký gửi online và thông tin một hoặc nhiều mặt hàng qua web; dữ liệu được lưu trong PostgreSQL.
- Admin xem danh sách phiếu/mặt hàng, duyệt hoặc từ chối, theo dõi trạng thái. Chỉ mặt hàng đã duyệt và còn bán mới xuất hiện trên danh sách công khai.
- Trang chi tiết mặt hàng hiển thị **số điện thoại của shop** làm đầu mối liên hệ; số của khách ký gửi chỉ admin được xem.
- Tra cứu quyết toán giữ adapter/fixture demo cho tới khi có dữ liệu và quy tắc quyết toán được xác nhận; không mặc định suy diễn từ dữ liệu ký gửi mới.
- SEO cơ bản, accessibility, kiểm tra giao diện và build production.

### Ngoài phạm vi mặc định

- Tài khoản khách hàng, giỏ hàng, thanh toán online, chuyển khoản và quản lý kho chuyên sâu.
- Đồng bộ CRM/POS, dữ liệu khách hàng hoặc API nội bộ của website gốc.
- Dò số điện thoại hoặc vượt xác minh Cloudflare của website tham chiếu.
- Tự động tải/sao chép toàn bộ tài nguyên có bản quyền hoặc đưa bản clone lên production.

Backend PostgreSQL cho ký gửi và duyệt hàng là phạm vi chính. Backend **quyết toán thật** vẫn là giai đoạn riêng, vì chưa có quy tắc và mẫu dữ liệu quyết toán được xác nhận.

## 2. Hiện trạng workspace

Đã kiểm tra `D:\hungnm\outsource\webkygui`: thư mục đang trống, chưa có `package.json`, ứng dụng, bộ test hoặc Git repository. Vì vậy đây là kế hoạch khởi tạo mới, không phải migration.

Lần làm việc này chỉ cập nhật tài liệu trong `docs/`, không cài package và không thay đổi website tham chiếu.

## 3. Kết quả khảo sát website

Quan sát trực tiếp bằng trình duyệt ở kích thước desktop khoảng 1265 × 712. Đã mở cả năm URL và chuyển sang chế độ online tại hai trang dịch vụ.

| Trang | Nội dung và hành vi đã xác nhận | Phần chưa xác nhận |
| --- | --- | --- |
| [Trang chủ](https://hunthanhlykygui.com/) | Nền đen, chữ H.U.N lớn ở giữa, bốn liên kết điều hướng, dải thông báo chạy phía trên, footer tối | Breakpoint và hiệu ứng trên thiết bị di động |
| [Giới thiệu](https://hunthanhlykygui.com/about) | Nền trắng; giới thiệu bên trái, timeline bên phải; ba cơ sở chia nhóm thường/Premium; nút sao chép hotline, liên kết tìm đường | Phản hồi sau khi sao chép; trang đích liên kết ngoài |
| [Ký gửi](https://hunthanhlykygui.com/consign) | Biểu phí, tiêu chí tiếp nhận, hai nút đổi quy trình; trực tiếp có 4 bước, online có 5 bước và liên kết Zalo; thông tin cơ sở phía dưới | Hiệu ứng chuyển trạng thái và bố cục mobile chính xác |
| [Thu mua](https://hunthanhlykygui.com/buy) | Thông báo chương trình, ba nhóm giá, tiêu chí; trực tiếp có 3 bước, online có 4 bước; lưu ý riêng cho đồ giá trị cao | Toàn bộ trạng thái responsive |
| [Quyết toán](https://hunthanhlykygui.com/sales) | Tiêu đề căn giữa, ô số điện thoại, nút tìm kiếm; có widget xác minh Cloudflare | Quy tắc validation, request/response, xác thực backend, nội dung báo cáo thành công và lỗi |

### Chi tiết thiết kế đã thấy

- Trang chủ tối; trang nội dung sáng; footer tối và đường phân cách mảnh.
- Dải thông báo chữ hoa chạy ngang; khi cuộn trang ký gửi, dải thông báo và liên kết về trang chủ vẫn xuất hiện trên màn hình.
- Tiêu đề trang giới thiệu lớn, timeline dọc có các mốc năm và đường kẻ ngang.
- Khối quy trình có nền xám nhạt, bo góc nhẹ; lựa chọn đang active có nền đen/chữ trắng; từng bước có số trong hình tròn đen.
- Trang quyết toán dùng form hẹp ở giữa, tiêu đề lớn và vạch nhấn màu vàng nhạt.
- Computed style tại `/sales`: tiêu đề dùng Montserrat, 63px, weight 500, letter-spacing 2.52px ở viewport khảo sát; input dùng Montserrat 16px; nút tìm kiếm dùng Arial 14px, letter-spacing 2px. Không suy ra toàn bộ website dùng một font duy nhất.

### Dữ liệu nghiệp vụ nhìn thấy

- Ký gửi: nhận tiền sau 50–60 ngày; dưới 60.000đ thu phí 20.000đ, từ 60.000–130.000đ thu 30.000đ, trên 130.000đ thu 25%; không bán được không mất phí.
- Thu mua: no-brand 80.000–100.000đ/kg, brand 150.000–200.000đ/kg, phụ kiện báo giá theo chiếc; có giới hạn theo chương trình.
- Trên website tham chiếu, quy trình online dẫn sang Zalo, không phải form upload trực tiếp. Form ký gửi qua web là yêu cầu mới của dự án.

Các mức phí, thời gian và địa chỉ chỉ là snapshot nội dung để đối chiếu; cần chủ dự án duyệt lại trước khi dùng cho hoạt động thực tế.

### Giới hạn bằng chứng

Chưa gửi form tra cứu, chưa sử dụng số điện thoại thật, chưa thao tác với CAPTCHA và chưa xem hồ sơ khách hàng. Widget có hiển thị trạng thái thành công tự động trong phiên khảo sát; điều này không chứng minh API tra cứu hoạt động hoặc không cần xác thực khác.

Không có bằng chứng về database, CMS, framework hay API của website gốc. Cấu trúc kỹ thuật, PostgreSQL và các trang hàng bán bên dưới là **thiết kế cho dự án mới**, không phải mô tả backend đã xác minh của website tham chiếu. Chưa lưu bộ ảnh baseline vào repository; cần bổ sung ở Phase 1.

## 4. Kiến trúc đề xuất

### Stack

- Next.js App Router, TypeScript strict; dùng bản stable tương thích tại thời điểm khởi tạo, ghi phiên bản và commit lockfile.
- Tailwind CSS và shadcn/ui để xây primitive; chỉnh theme để giống tham chiếu, không giữ nguyên phong cách dashboard mặc định.
- `lucide-react` cho icon; `next/font` để quản lý Montserrat có hỗ trợ tiếng Việt.
- React state cho tab/form; chưa cần Redux, Zustand hoặc thư viện animation lớn.
- Schema validation dùng Zod ở ranh giới nhận dữ liệu; form nhỏ có thể dùng state/native form, không bắt buộc thêm React Hook Form.
- PostgreSQL cho dữ liệu nghiệp vụ; dùng ORM hỗ trợ migration và transaction (đề xuất Prisma, kiểm tra phiên bản tương thích khi khởi tạo). Tách môi trường dev/staging/production, quản lý `DATABASE_URL` phía server.
- Ảnh hàng hóa lưu trong object storage có quyền sử dụng; PostgreSQL lưu đường dẫn, thứ tự và metadata. Không lưu binary ảnh trực tiếp trong bảng.
- Admin đăng nhập bằng session server-side và mật khẩu băm hoặc nhà cung cấp định danh phù hợp; mọi mutation kiểm tra quyền trên server.
- Vitest + Testing Library cho logic/component; Playwright cho luồng web và ảnh đối chiếu.
- Chọn npm làm package manager mặc định; không tạo nhiều loại lockfile.

Tham chiếu khởi tạo: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [shadcn/ui cho Next.js](https://ui.shadcn.com/docs/installation/next). Kiểm tra Node.js và peer dependencies theo tài liệu tại lúc triển khai; không dùng canary.

### Ranh giới server/client

- Layout và nội dung công khai là Server Components mặc định, đọc dữ liệu cấu hình typed cục bộ.
- Chỉ các phần cần tương tác như `ServiceModeTabs`, `CopyPhoneButton`, `ConsignmentForm`, `AdminReviewActions`, `SettlementLookupForm` dùng client component.
- Dải thông báo dùng CSS animation, không cần render loop bằng JavaScript.
- `SettlementService` tách UI khỏi fixture/HTTP adapter để thay nguồn dữ liệu mà không viết lại trang.
- Route Handler hoặc Server Action nhận phiếu ký gửi, validate và ghi PostgreSQL. Truy vấn danh sách/chi tiết công khai chạy phía server với bộ lọc trạng thái bắt buộc.
- Thao tác duyệt chạy trong transaction; sau commit mới làm mới trang hàng bán. Không cho client tự ghi trạng thái `approved`.
- Bản demo không gọi API website gốc. Bản thật dùng Route Handler hoặc backend được cấp quyền; secrets chỉ tồn tại phía server.

### Cấu trúc thư mục dự kiến

```text
docs/
  implementation-plan.md
  phase/
    01-foundation.md
    02-public-pages.md
    03-online-consignment.md
    04-admin-review.md
    05-public-catalog-qa.md
  reference/                    # ảnh baseline + ghi chú viewport khi triển khai
src/
  app/
    layout.tsx                  # lang=vi, font, metadata chung
    globals.css                 # tokens + styles dùng chung
    (site)/
      layout.tsx                # announcement + footer
      page.tsx                  # /
      about/page.tsx
      consign/page.tsx
      consign/submit/page.tsx   # form ký gửi online mới
      buy/page.tsx
      sales/page.tsx
      items/page.tsx            # danh sách hàng đang bán
      items/[slug]/page.tsx     # chi tiết + hotline shop
    (admin)/admin/
      login/page.tsx
      consignments/page.tsx     # danh sách phiếu
      consignments/[id]/page.tsx # xem phiếu và các mặt hàng
      items/page.tsx            # danh sách toàn bộ mặt hàng, lọc trạng thái
      items/[id]/page.tsx       # xem và duyệt một mặt hàng
    not-found.tsx
    error.tsx
    robots.ts
    sitemap.ts
    api/settlements/lookup/route.ts  # chỉ thêm khi triển khai backend thật
    api/consignments/route.ts         # tạo phiếu ký gửi
    api/admin/items/[id]/route.ts     # duyệt/từ chối/cập nhật trạng thái
  components/
    ui/                         # primitive shadcn/ui
    layout/                     # AnnouncementBar, SiteFooter, BackHomeLink
    shared/                     # BranchCard, CopyPhoneButton, Timeline
    services/                   # FeeTable, ServiceModeTabs, ProcessSteps
    consignments/               # ConsignmentForm, ItemFields, ImageUpload
    catalog/                    # ItemCard, ItemGallery, ShopContact
    admin/                      # ReviewQueue, StatusBadge, ReviewActions
    settlement/                 # LookupForm, LookupFeedback, Result
  content/
    site.ts                     # thương hiệu, thông báo, giờ làm việc
    branches.ts
    consign.ts
    buy.ts
  lib/
    utils.ts
    validation/settlement.ts
    services/settlement.ts      # interface + adapter selection
    db/                         # client, repository, transaction
    auth/                       # session và authorizeAdmin
    validation/consignment.ts
  types/
    content.ts
    settlement.ts
    consignment.ts
    catalog.ts
  mocks/
    settlements.ts              # chỉ dữ liệu tổng hợp, không có PII thật
public/
  assets/                       # tài nguyên có quyền sử dụng
prisma/
  schema.prisma
  migrations/
tests/
  unit/
  e2e/
```

## 5. Đặc tả giao diện và component

### Yêu cầu clone giao diện 1:1

- Với năm trang tham chiếu (`/`, `/about`, `/consign`, `/buy`, `/sales`), **ảnh chụp nguồn là chuẩn thiết kế**. Không tự thay bằng layout hoặc component mặc định của shadcn/ui nếu hình thức khác bản gốc; shadcn/ui chỉ cung cấp primitive và phải được tùy biến.
- Phase 1 lưu baseline theo từng URL, viewport và trạng thái: trang đầu/cuối, tab trực tiếp/online, các vùng có sticky hoặc animation. Ghi phiên bản nội dung và thời điểm chụp để tránh so với website đã thay đổi.
- Khi triển khai, đối chiếu cùng viewport, mức zoom, font đã tải, scroll position và trạng thái UI. So cả hình tổng thể lẫn các chi tiết: vị trí, kích thước, line wrap, tracking, màu, đường viền, icon, ảnh và animation.
- Không lấy việc “trông tương tự” làm đủ. Mọi sai khác nhìn thấy được ở năm trang tham chiếu phải sửa hoặc ghi rõ là thay đổi có chủ đích đã được duyệt, chẳng hạn CTA ký gửi qua web và đường dẫn hàng đang bán.
- Giao diện mobile phải được khảo sát thực tế trong Phase 1 rồi mới chốt layout; không suy đoán breakpoint chỉ từ ảnh desktop.
- Các trang mới `/consign/submit`, `/items`, `/items/[slug]` và admin kế thừa cùng hệ chữ, màu, khoảng cách và thành phần thị giác, nhưng không được mô tả là clone 1:1 của trang không tồn tại trên nguồn.

### Design system

Các số sau là điểm khởi đầu, không phải giá trị đã đo toàn bộ từ nguồn: nền `#000`/`#fff`, footer `#111`, panel `#f3f3f3`, border `#e5e5e5`, nội dung rộng khoảng 1120px; gutter 24px mobile và 48–64px desktop. Chốt token bằng ảnh baseline trước khi tinh chỉnh từng trang.

- Heading responsive bằng `clamp`, tránh cố định 63px trên màn hình hẹp.
- Giữ tracking rộng ở navigation, tiêu đề và CTA; body dễ đọc, hỗ trợ đầy đủ dấu tiếng Việt.
- Desktop dùng hai cột cho giới thiệu/timeline và phí/tiêu chí; mobile chuyển một cột theo thứ tự đọc.
- Nút quy trình được wrap hoặc xếp dọc khi thiếu chỗ; không gây tràn ngang.
- Chưa quyết định menu hamburger: phải quan sát mobile trước, không tự thêm nếu nguồn không có.
- Animation tôn trọng `prefers-reduced-motion`; có cách dừng dải chữ chạy. Nội dung lặp để tạo marquee cần ẩn với screen reader.
- Không sao chép hạn chế accessibility: duy trì focus visible, contrast phù hợp, thứ bậc heading rõ ràng.

| Thành phần | Cách triển khai | Primitive shadcn/ui |
| --- | --- | --- |
| Điều hướng trang chủ | `next/link`, chữ hoa, focus/hover phù hợp | Không cần NavigationMenu nếu chỉ là bốn link |
| Liên kết về trang chủ | Link + icon mũi tên, offset tránh announcement | Button variant link/ghost khi phù hợp |
| Thẻ cơ sở và tiêu chí | Component theo dữ liệu typed | Card, Separator |
| Biểu phí ký gửi | Bảng semantic, giữ đọc được trên mobile | Table |
| Chế độ trực tiếp/online | Tab có state riêng, keyboard navigation | Tabs |
| Danh sách bước | Ordered list và số tròn tùy chỉnh | Không cần thư viện riêng |
| Sao chép hotline | Clipboard API, thông báo thành công/thất bại | Button, Sonner |
| Form quyết toán | Label truy cập được, input tel, helper/error text | Input, Label, Button, Alert |
| Loading và kết quả demo | State machine đơn giản, không nhảy layout | Skeleton, Card, Table nếu cần |
| Form ký gửi online | Khách nhập liên hệ và danh sách mặt hàng; báo lỗi từng trường và xác nhận mã phiếu | Input, Textarea, Select, Button, Alert |
| Hàng đang bán | Lưới thẻ có ảnh, giá, trạng thái còn bán; chi tiết có hotline shop | Card, Badge, Carousel nếu cần |
| Trang admin | Lọc theo trạng thái, xem ảnh/giá/khách gửi và thao tác duyệt có xác nhận | Table, Tabs, Dialog, Badge |

### Yêu cầu theo route

1. `/`: tái hiện tỷ lệ announcement/hero/footer; giữ bốn link tham chiếu, bổ sung lối tới `/items` rõ ràng nhưng không làm sai bố cục chính.
2. `/about`: phần giới thiệu, timeline, nhóm cơ sở; nút copy dùng đúng hotline trong config; link ngoài giữ đúng đích được duyệt, không tự đổi link tìm đường thành bản đồ khác.
3. `/consign`: phí và tiêu chí; mặc định trực tiếp; đổi tab chỉ thay quy trình. Chế độ online có CTA mở `/consign/submit`, cập nhật hướng dẫn vì luồng nộp qua web là nghiệp vụ mới.
4. `/buy`: thông báo chương trình, ba nhóm giá và tiêu chí; chuyển giữa 3 bước trực tiếp/4 bước online; hiển thị cảnh báo nhận đồ giá trị cao rõ ràng.
5. `/sales`: form tra cứu bám hình thức nguồn; chỗ dành cho xác minh có trạng thái rõ. Bản demo dùng nhãn mô phỏng, không giả mạo chứng nhận Cloudflare thành công.
6. `/consign/submit`: form tên và SĐT người ký gửi, từng mặt hàng có tên, mô tả, loại, tình trạng, giá mong muốn và ảnh; hỗ trợ thêm/xóa mặt hàng trước khi gửi. Sau khi ghi thành công hiển thị mã phiếu và thông báo chờ duyệt. Không hiển thị dữ liệu khách hàng trên URL.
7. `/items`: chỉ liệt kê mặt hàng trạng thái `approved` và còn bán; hiển thị ảnh đại diện, tên, giá bán do admin xác nhận. Có empty state và phân trang. Không có mặt hàng chờ duyệt, bị từ chối, đã bán hoặc ẩn.
8. `/items/[slug]`: hiển thị đầy đủ ảnh, mô tả, tình trạng, giá và hotline **của shop** lấy từ cấu hình server. Mặt hàng không còn công khai trả 404; tuyệt đối không xuất SĐT/tên người ký gửi.
9. `/admin/login`, `/admin/items`, `/admin/items/[id]` và `/admin/consignments`: bảo vệ bằng xác thực admin. `/admin/items` là danh sách **mọi mặt hàng khách gửi**, có trạng thái, giá, ngày gửi, lọc và phân trang; chi tiết cho xem phiếu, sửa giá bán công khai, duyệt/từ chối có lý do, đánh dấu đã bán hoặc ẩn hàng. `/admin/consignments` nhóm các mặt hàng theo phiếu. Mọi thay đổi được ghi audit log.

## 6. Nghiệp vụ ký gửi online và PostgreSQL

### Luồng xử lý

1. Khách mở `/consign/submit`, nhập liên hệ và một hoặc nhiều mặt hàng, tải ảnh và gửi phiếu. Form áp dụng tiêu chí nhận hàng đã được chủ shop duyệt; mốc tối thiểu 5 sản phẩm đang hiển thị trên website tham chiếu sẽ là cấu hình nghiệp vụ, không hard-code vào UI.
2. Server kiểm tra dữ liệu, giới hạn kích thước/định dạng ảnh và tạo `consignment` cùng các `item` trạng thái `pending` trong **một transaction PostgreSQL**. Ảnh được tải vào storage trước khi xác nhận phiếu; nếu transaction lỗi, dọn các file vừa tải hoặc đưa vào job dọn rác. Trả mã phiếu công khai ngẫu nhiên, không dùng ID tuần tự để suy ra số hồ sơ.
3. Admin đăng nhập, xem danh sách và chi tiết; có thể duyệt/từ chối **từng mặt hàng** trong một phiếu. Khi duyệt bắt buộc có `sale_price`; giá mong muốn của khách không tự thành giá bán. Trạng thái chuyển bằng điều kiện hiện tại + transaction để tránh hai admin ghi đè.
4. Mặt hàng vừa duyệt xuất hiện tại `/items` sau khi ghi DB thành công và làm mới cache. Khách click mặt hàng để xem chi tiết và gọi **SĐT shop**; SĐT khách gửi không có trong API, HTML hoặc metadata công khai.
5. Admin có thể chuyển `approved` → `sold` hoặc `hidden`; mặt hàng lập tức rời danh sách đang bán. `rejected` và `sold` không được tự chuyển lại `approved` nếu chưa có quy trình duyệt lại được xác định.

### Mô hình dữ liệu đề xuất

| Bảng | Trường chính | Ràng buộc / mục đích |
| --- | --- | --- |
| `consignors` | `id`, `name`, `phone_normalized`, `created_at` | Thông tin riêng của khách; index SĐT cho admin, không trả từ public API |
| `consignments` | `id`, `public_code`, `consignor_id`, `note`, `created_at`, `updated_at` | Một phiếu gồm nhiều mặt hàng; `public_code` unique, khó đoán; trạng thái phiếu có thể suy ra từ các item |
| `items` | `id`, `consignment_id`, `slug`, `name`, `category`, `description`, `condition`, `desired_price`, `sale_price`, `status`, `reviewed_by`, `reviewed_at`, `published_at`, `created_at`, `updated_at` | `slug` unique; `sale_price > 0` khi approved; index `(status, published_at DESC)`; FK tới phiếu/admin |
| `item_images` | `id`, `item_id`, `storage_key`, `alt_text`, `sort_order` | Nhiều ảnh cho một mặt hàng; storage key không chứa PII; ảnh pending không public tùy tiện |
| `admin_users` | `id`, `email`, `password_hash` hoặc `provider_subject`, `role`, `active` | Chỉ admin hoạt động được duyệt; không lưu mật khẩu thuần |
| `item_status_events` | `id`, `item_id`, `from_status`, `to_status`, `actor_admin_id`, `reason`, `created_at` | Lịch sử duyệt/từ chối/đánh dấu bán/ẩn; dùng để truy vết |

`status` đề xuất: `pending`, `approved`, `rejected`, `sold`, `hidden`. Trạng thái hiển thị công khai chỉ `approved`. Dùng `CHECK`/enum và foreign key ở DB; migration được version hóa, không chỉnh bảng production thủ công. Dữ liệu mẫu dùng seed riêng, không dùng PII thật.

### API và phân quyền

| Hành động | Endpoint/Server Action đề xuất | Quyền và kết quả |
| --- | --- | --- |
| Nộp phiếu | `POST /api/consignments` | Public; validate server, chống spam/rate limit; trả `public_code`, không trả ID khách |
| Xem hàng bán | `GET /items`, `GET /items/[slug]` qua Server Components | Public; query DB luôn lọc `status = approved`; chỉ select trường công khai |
| Xem phiếu/mặt hàng | `/admin/items`, `/admin/items/[id]` và `/admin/consignments` | Admin; phân trang, lọc theo trạng thái; xem SĐT khách tại vùng quản trị |
| Duyệt/từ chối/cập nhật trạng thái | `PATCH /api/admin/items/[id]` hoặc Server Action | Admin; kiểm tra CSRF/session, validate chuyển trạng thái, ghi event và cập nhật item trong transaction |

Không tin `role`, `status`, `sale_price` hay `reviewed_by` từ form khách. Chỉ thao tác admin được phép đặt giá bán/trạng thái duyệt. Khi gửi form cần consent xử lý thông tin liên hệ và chính sách lưu/xóa dữ liệu. Ảnh phải kiểm tra MIME thực, dung lượng, số lượng; tạo kích thước tối ưu và URL phù hợp cho ảnh công khai. `SHOP_PHONE`/thông tin liên hệ shop nằm trong cấu hình của dự án và được dùng duy nhất tại trang chi tiết; không thay bằng `consignors.phone_normalized`.

## 7. Dữ liệu và tra cứu quyết toán

### Nội dung công khai

Tách cấu hình `SiteConfig`, `Branch`, `TimelineEvent`, `FeeTier`, `ProcessStep`, `ServiceMode`. Hotline, địa chỉ, giờ mở cửa và nội dung thông báo phải có một nguồn duy nhất, không lặp rải rác trong JSX. CMS chỉ bổ sung nếu có nhu cầu biên tập thường xuyên.

### Demo frontend

- Dùng adapter giả và fixture tất định; công bố mã/số demo ngay trong giao diện để người xem không nhập dữ liệu thật.
- Các trạng thái: idle, invalid, loading, success, empty, error, rate-limited, verification-required.
- Quy tắc số điện thoại là đề xuất cần duyệt: chuẩn hóa khoảng trắng, hỗ trợ đầu `0`/`+84`, không loại bỏ ký tự tùy tiện hoặc chấp nhận mọi chuỗi số.
- Fixture trả về một báo cáo tổng hợp, gồm mã phiếu giả, ngày gửi, tình trạng, tổng tiền, phí và số tiền thực nhận. Đây là thiết kế tạm, phải thay khi có mẫu báo cáo được phép xem.
- Không lưu số điện thoại vào URL, localStorage, analytics hoặc log; khi sửa input thì xóa kết quả cũ và hủy/bỏ qua response cũ.
- Demo không được gửi dữ liệu ra hệ thống ngoài hoặc thực hiện chuyển khoản.

### Backend thật — cần phê duyệt trước khi triển khai

Đề xuất `POST /api/settlements/lookup`, input số điện thoại đã chuẩn hóa + bằng chứng xác minh; schema và response cuối cùng chốt với chủ nguồn dữ liệu. Không khẳng định endpoint này tồn tại ở website gốc.

- Phải có API/database hợp lệ và bộ dữ liệu staging; không reverse-engineer API riêng hoặc scrape quyết toán.
- Xác minh Cloudflare, nếu chọn dùng, phải kiểm tra token ở server với khóa của chính dự án; không dùng khóa của nguồn.
- Anti-bot không thay thế quyền truy cập: cần cơ chế như OTP hoặc mã tra cứu bí mật trước khi trả dữ liệu cá nhân, tùy yêu cầu nghiệp vụ được duyệt.
- Validation server-side, giới hạn tần suất, chống dò hồ sơ, thông báo lỗi không tiết lộ tài khoản có tồn tại hay không khi chưa xác thực.
- Không cache công khai response; không đưa PII vào bundle, telemetry hoặc error message; secrets không có tiền tố public.
- Có timeout, xử lý token hết hạn, lỗi nguồn dữ liệu và chiến lược retry giới hạn.
- Ký gửi và hàng bán dùng PostgreSQL theo mục trên; nguồn dữ liệu và cơ chế quyết toán thật vẫn cần chốt riêng. Chưa chọn nhà cung cấp OTP.

## 8. Lộ trình gồm 5 phase

Ước lượng cho một lập trình viên, tính theo ngày công, không bao gồm thời gian chờ quyền truy cập hoặc duyệt nội dung. Mỗi file phase trong `docs/phase/` có checklist và tiêu chí hoàn thành riêng.

| Phase | Phạm vi | Đầu ra chính | Ước lượng |
| --- | --- | --- | --- |
| [1 — Khảo sát và nền tảng](phase/01-foundation.md) | Baseline, Next.js/TypeScript/shadcn/ui, PostgreSQL schema/migration | App skeleton, DB dev và bộ tham chiếu | 1,5–2,5 ngày |
| [2 — Trang công khai](phase/02-public-pages.md) | Năm route tham chiếu, tương tác, quyết toán demo | Giao diện và điều hướng public | 2,5–3,5 ngày |
| [3 — Ký gửi online](phase/03-online-consignment.md) | Form nhiều mặt hàng, ảnh, validation, ghi PostgreSQL | Phiếu và item `pending` lưu bền vững | 2–3 ngày |
| [4 — Admin duyệt](phase/04-admin-review.md) | Đăng nhập, danh sách/trạng thái, duyệt/từ chối, audit | Item `approved` có giá bán và lịch sử | 2–3 ngày |
| [5 — Hàng đang bán và bàn giao](phase/05-public-catalog-qa.md) | Danh sách/chi tiết public, hotline shop, QA, vận hành | Luồng đầu cuối hoạt động và README | 2,5–4 ngày |

Thực hiện tuần tự **1 → 2 → 3 → 4 → 5**. Tổng dự kiến **khoảng 11–16 ngày công**, phụ thuộc upload ảnh, hạ tầng xác thực và storage. Ước lượng này gồm PostgreSQL và admin, nhưng chưa gồm tích hợp quyết toán thật. Tích hợp quyết toán thật là backlog sau năm phase, cần nguồn dữ liệu, mẫu báo cáo và cơ chế xác thực được chốt riêng.

## 9. Kế hoạch kiểm thử và nghiệm thu

Đây là checklist cho giai đoạn triển khai, không phải tuyên bố đã chạy test. Chưa viết test code trong lần lập kế hoạch này.

### Kiểm thử chức năng

- Điều hướng bốn link từ trang chủ, trở về trang chủ, reload mọi route và browser history.
- Chuyển hai chiều giữa trực tiếp/online; chỉ một panel active, focus/keyboard đúng; số bước đúng theo khảo sát.
- Copy thành công/thất bại được thông báo; không làm thao tác ngoài ý muốn nếu clipboard bị chặn.
- Tra cứu demo: input trống/sai, hợp lệ, loading, empty, lỗi, kết quả và submit lặp.
- Không để response cũ ghi đè kết quả mới; không hiện kết quả cũ khi thay số; không submit trùng khi đang chờ.
- Với backend thật: token hết hạn, timeout, rate limit và truy cập không được phép, sử dụng dữ liệu staging đã được cấp.
- Khách gửi phiếu nhiều mặt hàng và ảnh: validation client/server, lưu đủ bản ghi; lỗi giữa chừng không để phiếu hoặc ảnh mồ côi; gửi lặp không tạo bản ghi trùng ngoài ý muốn.
- Admin: chưa đăng nhập không xem được trang/API; không thể tự nâng quyền từ payload; duyệt phải có giá bán, từ chối ghi lý do, thao tác đồng thời không ghi đè; audit log đúng actor/thời điểm.
- Public: pending/rejected/sold/hidden không có trong danh sách hoặc chi tiết; approved hiển thị sau duyệt; thay sold/hidden biến mất theo đúng quy tắc cache.
- Kiểm tra response public, HTML, metadata và payload ảnh không lộ tên/SĐT khách ký gửi; trang chi tiết dùng SĐT shop đã cấu hình.
- Migration chạy từ DB sạch; backup và restore trên staging được kiểm chứng trước khi dùng dữ liệu thật.

### Responsive và visual QA

- Viewport mục tiêu: 375, 390, 768, 1024, 1440px; xác nhận không tràn ngang.
- Đối chiếu ảnh bản clone với baseline website gốc ở cùng viewport, zoom, nội dung, trạng thái, scroll position và font đã tải; tắt/đóng băng marquee và transition khi so ảnh tĩnh.
- Ghi danh sách sai khác theo từng trang, sửa và chụp lại cho đến khi không còn sai khác nhìn thấy được chưa được duyệt ở năm trang tham chiếu.
- Kiểm tra hero, wrap tiêu đề, độ rộng nội dung, footer, tab và form; không để sticky che focus hoặc nội dung.
- Duyệt ảnh trước khi cập nhật baseline; không tự chấp nhận thay đổi ảnh chỉ để test pass.
- Mobile browser thật là bước riêng, không đồng nhất desktop viewport emulation với thiết bị thật.

### Quy tắc ARTEMIS khi triển khai test thiết bị

Tuân thủ hướng dẫn AGENTS.md đã được cung cấp: trước khi viết test tương tác thiết bị phải khám phá ứng dụng bằng ARTEMIS, kiểm tra `adb devices -l`, hỏi chọn serial khi có nhiều thiết bị; nếu lỗi thì chẩn đoán bằng `mobile_diagnose` trước. Dùng locator động và explicit wait cho trạng thái, chỉ fallback tọa độ đã xác minh khi framework hỗ trợ. Không tạo kịch bản mobile dựa trên phỏng đoán. Thiếu thiết bị/tool thì ghi blocked cho phần đó, không báo đã kiểm tra mobile.

### Điều kiện nghiệm thu

- [ ] Đủ 5 route tham chiếu cùng `/consign/submit`, `/items`, `/items/[slug]` và các route admin; không có dead link nội bộ.
- [ ] Năm trang tham chiếu được đối chiếu ảnh desktop/mobile và duyệt ở mức **giống hệt giao diện nguồn**; mọi khác biệt nhìn thấy được đã được sửa hoặc ghi là thay đổi có chủ đích.
- [ ] Build production, lint, typecheck và bộ test đã thống nhất đều pass.
- [ ] Không có hydration error hoặc lỗi console chưa xử lý trên luồng chính.
- [ ] Keyboard sử dụng được toàn bộ control; label form đầy đủ; trạng thái async dùng live region thích hợp.
- [ ] Metadata riêng cho mỗi trang, `lang=vi`, sitemap và robots theo môi trường; preview/demo đặt noindex.
- [ ] Mục tiêu Lighthouse trên production build: Performance ≥90, Accessibility ≥95, SEO ≥90; ghi rõ môi trường đo, widget ngoài có thể ảnh hưởng kết quả.
- [ ] Không chứa khóa bí mật hoặc dữ liệu khách hàng thật trong mã/fixture; dữ liệu ký gửi thật chỉ ở PostgreSQL/storage được cấp quyền. Demo quyết toán không phát sinh request tới backend website tham chiếu.
- [ ] Chỉ admin xem được số khách gửi; mặt hàng công khai hiển thị số shop và đúng trạng thái duyệt.
- [ ] README nêu cách cài/chạy/build/test, migration/seed, biến môi trường DB/storage, tạo admin, backup và giới hạn quyết toán demo.

## 10. Rủi ro và quyết định còn mở

| Vấn đề | Hướng xử lý |
| --- | --- |
| Chưa biết giao diện kết quả quyết toán | Dùng mẫu demo có nhãn; xin ảnh/mẫu đã ẩn PII trước khi yêu cầu clone chính xác |
| Nội dung, địa chỉ, thông báo thay đổi | Lưu snapshot theo ngày, tách config, yêu cầu duyệt nội dung trước xuất bản |
| Chưa rõ quyền dùng thương hiệu và tài nguyên | Dùng asset được cung cấp/cho phép; tránh hotlink; bản công khai cần xác nhận quyền sử dụng |
| Chưa xác minh responsive và animation đầy đủ | Hoàn thành baseline ở Phase 1 trước khi khóa thiết kế |
| Chưa có nguồn dữ liệu quyết toán thật | Ký gửi/hàng bán dùng PostgreSQL của dự án; quyết toán dùng mock cho tới khi có contract nghiệp vụ |
| Nội dung mới khác website tham chiếu | Thiết kế form, danh sách và admin cùng design system, đánh dấu đây là yêu cầu mở rộng |
| Ảnh và PII khách gửi | Storage riêng, quyền truy cập theo trạng thái; chọn lọc trường public; retention/backup do chủ dự án chốt |
| Hai admin thao tác cùng hàng | Transaction, điều kiện trạng thái hiện tại và audit log để phát hiện xung đột |
| Tra cứu quyết toán bằng điện thoại có nguy cơ lộ dữ liệu | Chốt cơ chế xác thực/quyền truy cập, rate limit và chính sách dữ liệu trước khi tích hợp quyết toán thật |
| Chưa có môi trường deploy | Demo có thể deploy preview sau khi được yêu cầu; bản có Route Handler cần runtime server, không chỉ static export |

Các quyết định cần chốt trước production: quyền thương hiệu/nội dung; chính sách nhận ít nhất 5 món; trường bắt buộc/giới hạn ảnh; quy tắc giá bán, số shop hiển thị, chính sách giữ/xóa PII; hosting PostgreSQL/storage; mẫu và nguồn dữ liệu quyết toán, xác thực tra cứu. Các giá trị chưa chốt phải đặt trong cấu hình hoặc ghi rõ giả định khi triển khai.

## 11. Nguồn tham chiếu

- [Trang chủ H.U.N](https://hunthanhlykygui.com/)
- [Giới thiệu](https://hunthanhlykygui.com/about)
- [Ký gửi](https://hunthanhlykygui.com/consign)
- [Thu mua](https://hunthanhlykygui.com/buy)
- [Tra cứu quyết toán](https://hunthanhlykygui.com/sales)
- [Next.js — Installation](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn/ui — Next.js](https://ui.shadcn.com/docs/installation/next)

Các trang H.U.N đã được mở trực tiếp ngày khảo sát; những phần đề xuất được phân biệt với phần đã quan sát trong tài liệu này.
