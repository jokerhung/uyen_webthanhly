# Kế hoạch chuyển quản lý ảnh sang MinIO chạy Docker

Ngày lập: 27/09/2026. Trạng thái: kế hoạch, chưa triển khai hoặc di chuyển dữ liệu.

## 1. Mục tiêu và phạm vi

**Chỉ ảnh sản phẩm chuyển sang MinIO. Logo và favicon giữ nguyên luồng upload, lưu local và phục vụ hiện tại.** PostgreSQL tiếp tục lưu metadata và khóa ảnh. Giữ nguyên giao diện upload, nút thêm/xóa ảnh, gallery và đường dẫn phục vụ ảnh hiện tại.

Bao gồm:

- Upload ảnh khi khách gửi phiếu ký gửi/thu mua.
- Admin upload thêm, xóa ảnh qua thumbnail hoặc API quản trị.
- Logo, logo cũ và favicon nằm ngoài phạm vi di chuyển. Không đổi `ShopSettings.logoKey`, không copy hoặc xóa file logo.
- Di chuyển ảnh hiện có, kiểm chứng, chuyển đổi nguồn lưu trữ và phương án quay lui.
- Docker Compose, bucket private, tài khoản ứng dụng, backup và vận hành.

Chưa triển khai upload trực tiếp từ browser tới MinIO, CDN ảnh, presigned URL, tối ưu nhiều biến thể ảnh hoặc thay đổi quy tắc tiếp nhận/duyệt hàng.

## 2. Hiện trạng đã kiểm tra

- `compose.yaml` có service `db` PostgreSQL 16 và volume `postgres_dev_data`; chưa có MinIO.
- `src/lib/storage/images.ts` cung cấp `storePrivateImage`, `readPrivateImage`, `deletePrivateImage`, `cleanupPrivateImages`.
- Root ảnh lấy từ `CONSIGNMENT_STORAGE_DIR`, mặc định `.private/consignments`, nằm ngoài `public/`.
- Khóa ảnh dạng 64 ký tự hex và đuôi jpg/png/webp; ảnh upload mới được sharp xử lý thành WebP.
- `ItemImage.storageKey` và `ShopSettings.logoKey` tham chiếu file. Logo cũ được giữ private; route chỉ phục vụ logo hiện tại.
- Xóa ảnh: xóa liên kết DB trước rồi dọn file; lỗi cleanup hiện chỉ ghi log. Khi upload thành công nhưng transaction DB thất bại, hệ thống cố xóa file vừa upload.

| Luồng | Điểm tích hợp hiện tại |
| --- | --- |
| Khách upload ảnh | `src/app/api/consignments/route.ts` |
| Admin thêm/xóa ảnh | `src/app/api/admin/items/[id]/images/route.ts` |
| Admin xem ảnh | `src/app/api/admin/images/[key]/route.ts` |
| Public xem ảnh hàng đang bán | `src/app/api/items/[slug]/images/[imageId]/route.ts` |
| Upload logo — giữ local | `src/app/api/admin/settings/shop/logo/route.ts` |
| Preview logo — giữ local | `src/app/api/shop/logo/[key]/route.ts` |
| Favicon — giữ local | `src/app/api/shop/favicon/[key]/route.ts` |

## 3. Kiến trúc đề xuất

```text
Browser → API ảnh sản phẩm → kiểm tra quyền / trạng thái / dữ liệu
                      ├─ sharp: kiểm tra, xoay, resize, bỏ EXIF
                      ├─ Storage adapter → MinIO private bucket
                      └─ Prisma → PostgreSQL: key, metadata, liên kết, audit

Browser ← Route ảnh sản phẩm ← kiểm tra DB/quyền ← MinIO GetObject

Logo upload / preview / favicon → images.ts hiện tại → filesystem local
```

- Giữ một bucket private, ví dụ `besties-media`, và giữ nguyên key hiện tại. Không thêm prefix vào key trong lần chuyển đầu để tránh sửa tất cả validator/route/DB.
- Chưa cần đổi schema `ItemImage` hoặc `ShopSettings` chỉ để chuyển storage. Thêm bảng cleanup riêng nếu cần xử lý xóa thất bại bền vững.
- Giữ URL qua Next.js; không trả endpoint nội bộ hoặc credentials MinIO ra client.
- Public image route vẫn kiểm tra hàng đang bán và loại tiếp nhận theo `catalogWhere`. Ảnh private chỉ đọc sau khi xác thực admin. Logo/favicon chỉ đọc key đang được ShopSettings tham chiếu.
- Dùng S3 SDK phía server, đề xuất `@aws-sdk/client-s3`; kiểm tra phiên bản tương thích khi cài, khóa bằng lockfile. Adapter hỗ trợ put/get/head/delete, timeout, retry giới hạn và ánh xạ lỗi.
- Giữ `images.ts` là storage local cho logo/favicon. Thêm facade `product-images.ts` riêng cho ảnh sản phẩm và chỉ chuyển bốn caller ảnh sản phẩm ở bảng mục 2 sang facade mới. Dùng lại validation key/ảnh; không để module client import SDK/secrets.
- Driver ảnh sản phẩm chọn qua `PRODUCT_IMAGE_STORAGE_DRIVER=local|minio`; không tự chuyển về local khi MinIO lỗi vì dễ tạo hai nguồn dữ liệu lệch nhau.
- `readPrivateImage` trả Buffer có giới hạn kích thước theo chính sách ảnh. Stream response là cải tiến sau nếu cần, không bắt buộc cho ảnh đã resize.

## 4. Docker và cấu hình

### Chọn bản MinIO

Tại thời điểm lập kế hoạch, repository chính thức hiển thị trạng thái archived và README mô tả phân phối source-only. Không mặc định dùng `minio/minio:latest` hoặc coi image cũ là bản đang được cập nhật. Phase 1 phải chốt source commit/tag, Dockerfile/build chain hoặc image đã kiểm chứng, pin digest và ghi rõ cách bảo trì. Không tự đổi sang sản phẩm khác. Nguồn: [MinIO repository](https://github.com/minio/minio), [Dockerfile chính thức](https://github.com/minio/minio/blob/master/Dockerfile), [hướng dẫn container](https://github.com/minio/minio/blob/master/docs/docker/README.md).

### Thành phần Compose dự kiến

- Thêm `minio` vào `compose.yaml`, dùng image đã pin; chạy server với data directory `/data` và console port 9001.
- Volume `minio_data:/data`; không chia sẻ với volume PostgreSQL. Docker Desktop Windows nên dùng named volume cho môi trường local.
- Local map `127.0.0.1:9000:9000` cho S3 API và `127.0.0.1:9001:9001` cho console; nếu port đang dùng thì đổi host port.
- Healthcheck dùng cơ chế có sẵn trong image đã chọn, xác nhận công cụ tồn tại; init chỉ chạy sau khi service ready.
- Init idempotent tạo bucket private, policy và tài khoản ứng dụng. Không tự đổi secret hoặc cấp quyền rộng hơn mỗi lần khởi động.
- Root credentials chỉ dùng bootstrap/vận hành; Next.js dùng tài khoản riêng, giới hạn Get/Put/Delete trên bucket của dự án. Không cấp quản trị server; quyền List chỉ cấp cho migration/cleanup nếu cần.
- Không public console/API qua domain website theo mặc định. Nếu MinIO chạy khác host, dùng TLS và cấu hình CA hợp lệ; không tắt kiểm tra chứng chỉ.

| Biến | Mục đích |
| --- | --- |
| `PRODUCT_IMAGE_STORAGE_DRIVER` | `local` trước cutover, `minio` sau cutover |
| `S3_ENDPOINT` | App chạy host: `http://127.0.0.1:9000`; app trong cùng Compose: `http://minio:9000` |
| `S3_REGION` | Region khớp cấu hình MinIO, chốt khi bootstrap |
| `S3_BUCKET` | `besties-media`, tách bucket/instance giữa dev, staging, production |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Credentials tài khoản ứng dụng, server-only |
| `S3_FORCE_PATH_STYLE` | Bật cho cấu hình MinIO path-style dự kiến |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | Bootstrap container; không dùng trong Next.js |
| `CONSIGNMENT_STORAGE_DIR` | Tiếp tục dùng lâu dài cho logo/favicon local; đồng thời là nguồn ảnh sản phẩm cũ khi migration/quay lui |

Chỉ ghi placeholder vào `.env.example`; secrets qua `.env` không commit hoặc secret manager. Các lệnh dự kiến sau khi có cấu hình: `docker compose up -d minio`, chạy init, rồi smoke check. Không chạy `docker compose down -v` trong quy trình triển khai vì sẽ mất volume dữ liệu.

## 5. Quy tắc upload, xóa và tính nhất quán

### Upload

1. Xác thực/kiểm tra origin của API ảnh sản phẩm như hiện tại. Không sửa form hay API upload logo.
2. Kiểm tra số lượng, tổng dung lượng và từng file; kiểm tra magic bytes/MIME và decode thực bằng sharp. Khóa storage do server sinh, không dùng tên file khách làm đường dẫn.
3. Reencode ảnh, PutObject với Content-Type đúng và SHA-256 metadata; chờ upload thành công mới ghi key vào DB.
4. Commit transaction DB; nếu lỗi thì xóa object mới. Nếu cleanup thất bại, lưu công việc cleanup để retry.
5. Không đưa lỗi/credentials S3 ra response; trả thông báo có thể thử lại. Giữ idempotency của phiếu ký gửi và version/updatedAt của admin.

### Xóa/thay ảnh

- Giữ kiểm tra quyền, ảnh thuộc đúng Item và quy tắc ít nhất một ảnh đối với hàng đang bán.
- Gỡ liên kết DB và ghi audit cùng transaction; sau commit, route đọc ảnh phải trả 404 ngay dù object chưa xóa xong.
- Tạo `StorageCleanupJob` trong cùng transaction xóa liên kết: key, trạng thái, số lần thử, lịch thử tiếp, lỗi rút gọn; worker xóa MinIO rồi đánh dấu hoàn thành. DeleteObject phải idempotent.
- Với rollback upload trước khi có transaction commit, cố xóa ngay, nếu không được thì enqueue cleanup. Khi DB cũng không truy cập được, reconciliation phát hiện object mồ côi sau thời gian grace.
- Cleanup MinIO chỉ xử lý bucket ảnh sản phẩm. Không quét/xóa filesystem dùng chung theo tiêu chí “không được ItemImage tham chiếu”: đó có thể là logo hiện tại hoặc logo cũ.
- Worker luôn kiểm tra lại tham chiếu đang sống trước khi xóa; không xóa object đang được dùng hoặc được bảo vệ theo retention.
- Favicon tiếp tục sinh từ logo local bằng luồng hiện có, hoàn toàn độc lập với MinIO. Khi MinIO mất kết nối, logo/favicon vẫn phải hoạt động.

## 6. Kế hoạch thực hiện — 6 giai đoạn

### Giai đoạn 1 — Kiểm kê và chốt Docker image (0,5–1 ngày)

- [ ] Chốt phiên bản/image MinIO và client bootstrap có thể tái lập; ghi tag/commit/digest, kiểm tra nguồn và bản vá.
- [ ] Kiểm tra Docker, dung lượng, port, quyền volume; phân biệt app chạy host hay container.
- [ ] Lấy danh sách migration từ `ItemImage.storageKey`, không copy cả thư mục local. Lập danh sách bảo vệ logo từ `ShopSettings.logoKey` và lịch sử upload-logo; file không rõ nguồn gốc chỉ báo cáo, không copy/xóa.
- [ ] Backup PostgreSQL và toàn bộ root ảnh; lập manifest key/kích thước/SHA-256.

Đầu ra: image đã kiểm chứng, inventory và backup có thể khôi phục. Không chỉnh dữ liệu thật trong bước kiểm kê.

### Giai đoạn 2 — MinIO và bootstrap (0,5–1 ngày)

- [ ] Thêm service, named volume, healthcheck và cấu hình env; giữ service db hiện tại.
- [ ] Init bucket private, policy app và credentials migration riêng.
- [ ] Smoke check put/get/head/delete bằng object thử; restart container kiểm tra persistence.
- [ ] Xác nhận anonymous truy cập bucket/object bị từ chối, app không thể truy cập bucket khác.

Đầu ra: MinIO sẵn sàng trên dev/staging, ứng dụng vẫn dùng driver local.

### Giai đoạn 3 — Storage adapter và tích hợp (1–1,5 ngày)

- [ ] Tách driver trong `src/lib/storage/`, thêm MinIO adapter và cấu hình fail-fast.
- [ ] Chuyển bốn caller ảnh sản phẩm ở bảng mục 2 sang `product-images.ts`; ba route logo/favicon vẫn dùng `images.ts` local. Giữ nguyên key và URL.
- [ ] Bổ sung timeout, xử lý NoSuchKey, lỗi xác thực/storage không khả dụng; không lộ secrets.
- [ ] Giữ giới hạn request và quyền xem ảnh; xác nhận ảnh sản phẩm admin/public dùng adapter mới, còn logo/favicon vẫn đọc local.

Đầu ra: ảnh sản phẩm chọn local hoặc MinIO bằng cấu hình riêng; logo/favicon luôn dùng local.

### Giai đoạn 4 — Cleanup và migration ảnh (1–1,5 ngày)

- [ ] Triển khai cleanup job/worker và reconciliation dry-run chỉ cho ảnh sản phẩm.
- [ ] Script migrate có `--dry-run`, manifest, resume và verify; dùng một key = một object, copy byte nguyên trạng. Chỉ key thuộc ItemImage được đưa vào MinIO; nếu phát hiện key trùng với logo thì báo xung đột để xử lý, không tự di chuyển/xóa.
- [ ] Nếu object đã có: so SHA-256 và size; giống thì bỏ qua, khác thì báo xung đột, không ghi đè.
- [ ] Không dùng ETag làm checksum tuyệt đối; tải lại object để tính SHA-256 hoặc kiểm tra checksum được hỗ trợ và đã xác minh.
- [ ] Chỉ liệt kê file hợp lệ trong root đã resolve, không đi theo symlink ra ngoài; báo cáo file thiếu/hỏng thay vì tạo ảnh thay thế.

Đầu ra: báo cáo đối chiếu đầy đủ, chạy script lần hai không tạo bản sao hoặc đổi DB key.

### Giai đoạn 5 — Kiểm thử và chuyển đổi (0,5–1 ngày)

- [ ] Kiểm tra luồng sản phẩm trên staging: gửi phiếu nhiều ảnh, upload admin và xóa ảnh. Kiểm tra hồi quy upload logo/preview/favicon vẫn dùng local, kể cả khi MinIO dừng.
- [ ] Thử file giả MIME, ảnh hỏng, quá dung lượng, vượt số lượng, user không đăng nhập, key sai, ảnh không thuộc Item.
- [ ] Thử MinIO mất kết nối, DB lỗi sau upload, cleanup thất bại, request lặp và xung đột admin.
- [ ] Trước cutover, tạm dừng mutation ảnh sản phẩm (upload/xóa); đợi request đang chạy kết thúc. Luồng logo không chuyển backend và không cần dừng riêng vì migration sản phẩm.
- [ ] Copy delta lần cuối, đối chiếu checksum/key với snapshot ItemImage; chỉ tiếp tục nếu mọi key ảnh sản phẩm cần dùng đều có object đúng.
- [ ] Chuyển `PRODUCT_IMAGE_STORAGE_DRIVER=minio`, restart app để nạp env, smoke check đọc trước rồi mở mutation.

Đầu ra: ảnh và upload hoạt động qua MinIO, dữ liệu cũ không mất. Không cần chuyển URL public hoặc sửa khóa ngoại.

### Giai đoạn 6 — Vận hành, backup và bàn giao (0,5–1 ngày)

- [ ] Theo dõi lỗi storage, độ trễ đọc/ghi, dung lượng volume và số cleanup job chờ/lỗi.
- [ ] Backup PostgreSQL + object sản phẩm và tiếp tục backup volume local chứa logo sang vị trí/thiết bị khác. Named volume và bản mirror có xóa lan truyền không phải backup đầy đủ.
- [ ] Chạy restore drill vào môi trường mới, đối chiếu key/ảnh/logo và quyền truy cập.
- [ ] Giữ snapshot ảnh sản phẩm local trong cửa sổ quay lui. Chỉ dọn các file sản phẩm theo manifest sau nghiệm thu; tuyệt đối không xóa toàn bộ root/volume vì logo vẫn đang dùng.
- [ ] Ghi runbook cài/khởi động/dừng MinIO, thay credentials, khôi phục, upgrade image và xử lý đầy disk.

Tổng dự kiến: **4–7 ngày công**, chưa tính thời gian xử lý ảnh thiếu, chọn/build image hoặc truyền dữ liệu lớn. Các giai đoạn phụ thuộc tuần tự 1 → 2 → 3 → 4 → 5 → 6.

## 7. Kế hoạch quay lui

- Trước khi mở ghi ở MinIO: đổi driver về local và restart, vì key và file local chưa bị thay đổi.
- Sau khi đã có upload/xóa mới trên MinIO: không chỉ đổi driver. Tạm dừng mutation, snapshot DB hiện tại, xuất các object đang được ItemImage tham chiếu về root local và kiểm tra SHA-256/size. Không ghi đè file khác nội dung.
- DB hiện tại vẫn là nguồn quyền truy cập: file local cũ còn tồn tại nhưng không có tham chiếu không được phục vụ.
- Chỉ đổi driver khi tất cả key đang sống có file local hợp lệ; kiểm tra ảnh sản phẩm rồi mở ghi trở lại; logo/favicon không thay nguồn. Nếu thiếu object thì giữ MinIO và xử lý trước, không rollback mù.
- Giữ cả backup trước cutover lẫn dữ liệu phát sinh sau cutover; không restore DB cũ đơn lẻ vì sẽ mất phiếu mới.

## 8. Tiêu chí nghiệm thu

- [ ] Tất cả ảnh sản phẩm sống trong ItemImage đọc được từ MinIO, checksum khớp nguồn. Logo hiện tại và logo cũ không được copy sang bucket.
- [ ] Upload ảnh sản phẩm mới không còn tạo file trong root local khi driver sản phẩm là MinIO; upload logo vẫn tạo file local.
- [ ] Gallery, thumbnail, logo preview, favicon và các URL ảnh cũ vẫn hoạt động.
- [ ] Hàng chưa công khai không bị lộ qua bucket hoặc route public; ảnh bị xóa không truy cập được.
- [ ] Không tạo DB record khi upload MinIO thất bại; không có object mồ côi không được theo dõi sau rollback.
- [ ] Cleanup retry không xóa nhầm ảnh có tham chiếu và không động tới logo/favicon local.
- [ ] Restart MinIO/app không mất ảnh; restore backup được kiểm chứng.
- [ ] Typecheck, lint, build và kiểm tra tích hợp trên MinIO thật đạt. Chỉ mock SDK không đủ để nghiệm thu storage.

## 9. File dự kiến thêm/chỉnh

```text
compose.yaml
.env.example
docker/minio/                 # tài liệu build image, bootstrap/policy không chứa secret
src/lib/storage/
  images.ts                   # giữ nguyên backend local cho logo/favicon
  product-images.ts           # facade chọn driver chỉ cho ảnh sản phẩm
  local.ts
  s3.ts
  config.ts
scripts/
  migrate-images-to-minio.mjs
  verify-image-storage.mjs
  cleanup-images.mjs
prisma/schema.prisma          # nếu bổ sung StorageCleanupJob
prisma/migrations/...
docs/minio-operations.md
```

Các API upload/đọc/xóa được rà lại đầy đủ nhưng không đổi contract giao diện ngoài những thông báo lỗi cần thiết. Đây là tài liệu kế hoạch; chưa cài Docker image, tạo bucket, sửa secrets hoặc di chuyển/xóa ảnh trong lần làm việc này.
