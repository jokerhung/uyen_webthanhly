# Phase 2 — đối chiếu và những điểm chưa duyệt

Ngày triển khai: 24/09/2026. Nguồn: `docs/reference/` (24 ảnh nguồn ở viewport desktop 1440×900 và Chrome mobile emulation 390×844, chụp 23/09/2026); tra DOM và CSS nguồn bằng Chrome. Đây là **ghi chú triển khai**, không phải biên bản duyệt clone 1:1. Môi trường tác nhân không đọc được pixel ảnh PNG, vì vậy chưa đối chiếu trực quan ảnh nguồn với ảnh clone; không tuyên bố giao diện giống hệt.

| Route | Phần đã triển khai | Khác biệt/chưa xác minh |
| --- | --- | --- |
| `/` | Ticker, hero H.U.N, bốn link chính, footer | Chưa duyệt sai khác pixel và trạng thái animation; lối dẫn đến hàng đang bán chưa thể thêm vào hero mà không được duyệt thay đổi bố cục nguồn. |
| `/about` | Giới thiệu, timeline, ba cơ sở, sao chép hotline cấu hình | Link tìm đường **vô hiệu hóa** vì đích chưa được chủ dự án duyệt; số hotline chung thay cho số riêng từng cơ sở nếu có. |
| `/consign` | Phí, tiêu chí, tab 4/5 bước và CTA `/consign/submit` | CTA/form web là tính năng mới, không có trên nguồn; chính sách phí/số món cần duyệt trước kinh doanh. |
| `/buy` | Giá tham khảo, tiêu chí, tab 3/4 bước | Mức giá, nhận đồ có giá trị cao và giới hạn theo chương trình chưa được xác nhận cho hiện tại. |
| `/sales` | Khung tra cứu + fixture demo, các trạng thái invalid/loading/success/empty/error/rate-limited/verification-required | **Không dùng CAPTCHA nguồn** hoặc truy vấn backend nguồn. Nút demo có thể gửi số giả, khác nút bị khóa vì Cloudflare trên nguồn; dữ liệu và kết quả thật chưa biết. |

Đã kiểm tra `lint`, `typecheck`, unit (10), production build và Playwright (17 gồm route, tab bàn phím, CTA, demo, không tràn ngang ở 390px). E2E chạy production server riêng vì một `next dev` cũ tại port 3100 trả trang HTML nhưng HMR websocket lỗi và không hydrate các client component; không thể dựa vào thử nghiệm dev server đó để kết luận lỗi tương tác app. Cần chạy lại khi dev server cũ được khởi động sạch. Chưa kiểm tra thiết bị thật, các viewport 375/768/1024, hover/focus toàn diện, baseline pixel, external destinations hoặc chính sách được phê duyệt.
