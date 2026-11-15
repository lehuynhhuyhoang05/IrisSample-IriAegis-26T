# Đối chiếu Android → Web và kết quả rà soát giao diện

Ngày rà soát: 15/11/2026. Phạm vi: source Android trong `../IrisSample-IriAegis-26T` và bản portal Web tại `src/portal`. Đây là kết quả đọc code kết hợp chạy thử Web; không phải xác nhận chạy lại tất cả chức năng Android trên thiết bị.

## 1. Kết luận về độ đầy đủ

Web đã có các nhóm màn hình nghiệp vụ chính, nhưng **chưa tương đương đầy đủ với Android**. Có ba loại khác biệt: tính năng còn thiếu, thao tác có giao diện nhưng kết quả đang giả lập, và quy tắc đã được thay đổi trong prototype. Không cộng ba loại này thành phần trăm hoàn thành hoặc báo “full chức năng”.

Chưa tích hợp API, gửi email thật, đối sánh danh tính hay module liveness. File `openapi.yml` có trong workspace nhưng đợt này chưa dùng để kết nối dịch vụ. Dữ liệu portal vẫn lưu tại trình duyệt.

## 2. Bảng truy vết chức năng

Đường dẫn Java trong bảng tính từ `app/src/main/java/com/iritech/irissample/`; các file Web tính từ `src/portal/`.

| Chức năng | Nguồn Android cần đọc | Web và kết quả đối chiếu |
|---|---|---|
| Khởi tạo Super Admin | `LoginActivity`, `RegisterAdminActivity` | `Auth.jsx`, `domain.js`: có luồng khởi tạo khi dữ liệu rỗng, tài khoản demo. Chưa xác thực server. |
| Đăng nhập, đăng xuất, bước xác thực mặt | `LoginActivity`, `FaceCaptureActivity` | `Auth.jsx`, `shared.jsx`: có giao diện và nhánh kết quả. Camera thật; đối sánh mặt là giả lập, không có MobileFaceNet trên Web. |
| Quên/đặt lại mật khẩu | `LoginActivity` và luồng email/token | `Auth.jsx`: mô phỏng yêu cầu, token và đặt mật khẩu. Không gửi email thật; không phải cơ chế xác thực an toàn. |
| Hồ sơ Admin | `ProfileActivity.attemptSave` | `Catalog.jsx`: xem/sửa tên, email, ảnh, điện thoại, ngày sinh, giới tính, mô tả, đổi mật khẩu có nhập lại. Đợt này bổ sung các trường cá nhân bị thiếu. Chưa thay thế xác nhận khóa thiết bị và email thông báo thay đổi của Android. |
| Nhắc cập nhật lần đầu | `MainActivity.checkFirstLoginAndShowDialog` | **Còn thiếu cơ chế `firstLogin` tương đương.** Android có nhắc bổ sung ảnh/hồ sơ theo trạng thái tài khoản. Có màn hồ sơ không đồng nghĩa đã có luồng nhắc này. |
| Quản lý Admin | `AdminListActivity`, `AdminDetailActivity`, `RegisterAdminActivity` | `Catalog.jsx`: danh sách, chi tiết, thêm/sửa/xóa, nhập CSV, ảnh. Phân quyền và mật khẩu xác nhận chỉ là bảo vệ thao tác demo phía frontend. Cần đối chiếu thêm toàn bộ validation và quy tắc xóa khi nối API. |
| Môn học/lịch học | `SubjectListActivity`, `AddSubjectActivity` | `Catalog.jsx`: CRUD, tìm kiếm, giảng viên, học kỳ, lịch, CSV. Web đã có mô hình nhiều ca có cấu trúc; không coi đây là schema Android/API chính thức. |
| Sinh viên toàn hệ thống và trong môn | `StudentManagementActivity`, `StudentListActivity` | `Catalog.jsx`: CRUD, tìm kiếm, gán/bỏ môn, tạo sinh viên trong môn, CSV, ảnh, điện thoại. Đã thêm lọc đã/chưa điểm danh hôm nay trong chi tiết môn. Phân biệt xóa hồ sơ với bỏ khỏi môn. |
| Chụp/chọn ảnh, chống trùng ảnh | `FaceCaptureActivity`, `FaceMatchHelper`, các Activity đăng ký | `App.jsx`, `shared.jsx`: chụp/chọn ảnh thật, preview, MediaPipe phát hiện khuôn mặt. Chống trùng/khớp ảnh cũ là lựa chọn kịch bản giả lập; chưa xác minh một người đã đăng ký nhiều tài khoản. |
| Điểm danh từ danh sách hoặc mã SV | `StudentListActivity`, `StudentManagementActivity` | `Attendance.jsx`: chọn/nhập mã → mật khẩu → camera/liveness/đối sánh giả lập → ghi nhận local. Không tạo tài khoản sinh viên tự đăng nhập. Demo có thêm chọn ngày/ca, chưa tương đương hoàn toàn với điểm danh tại thời điểm hiện tại trên Android. |
| Phân loại đúng giờ/muộn | `AttendanceManagementActivity.classifyCheckinStatus` | `domain.js`: đã sửa mốc sau 15 phút đầu; đúng tại mốc 15 phút vẫn là đúng giờ. Có test biên theo giây. Không tự bật các nhánh giới hạn giờ đang bị comment ở Android. |
| Lịch sử, lọc, thống kê học kỳ, CSV | `AttendanceManagementActivity.loadSemesterAggregateRecords`, `showExportModeDialog` | `Attendance.jsx`: có báo cáo buổi/lịch sử/học kỳ, tìm kiếm, lọc, xuất. Đã sửa tổng học kỳ theo số ngày có ghi nhận của môn. Báo cáo theo buổi của Web vẫn suy ra vắng khi ca dự kiến kết thúc — đây là khác biệt cần thống nhất, không phải cùng một quy tắc với tổng hợp học kỳ. |
| Biểu đồ và thống kê từng sinh viên | `calculateAndShowChart`, `showStudentStatsDialog`, `AttendanceRecordAdapter` | Đã bổ sung biểu đồ thanh có nhãn/số, hộp thoại thống kê từng sinh viên và cảnh báo vắng từ 2 buổi. Biểu đồ Web thay hình thức donut; dữ liệu vẫn là demo. |
| Người nhận và gửi báo cáo | `AttendanceManagementActivity.setupEmailComponent`, `EmailService` | `Operations.jsx`: CRUD/import người nhận, chọn từng người/chọn tất cả, xuất file trước khi xem/gửi, preview, lỗi/thử lại, lịch sử giả lập. Đợt này sửa việc gửi mặc định toàn bộ người nhận. Chưa gửi SMTP/API; nội dung đính kèm hiện là lịch sử môn, chưa chuyển nguyên báo cáo đã lọc từ màn Reports. |
| Sao lưu/khôi phục | `BackupRestoreActivity`, `BackupRestoreHelper`, `EncryptionHelper` | `Operations.jsx`: JSON demo, tải/nhập/khôi phục, xóa một/xóa tất cả bản trong phiên. **Không tương đương backup mã hóa của Android.** Danh sách chỉ trong bộ nhớ màn hình. Android `showBackupsList` còn TODO; danh sách Web là cách mô phỏng, không phải tính năng Android đã hoàn tất. |
| Mống mắt/USB/license | `CaptureActivity`, `LicenseCheckHelper`, các module SDK liên quan | Chỉ thông báo chưa tích hợp. Không có luồng Web hoạt động tương đương; cần SDK, thiết bị và phương án trình duyệt/server. |

## 3. Sai khác cần xử lý trước khi tuyên bố hoàn tất chuyển chức năng

1. **Nhắc hồ sơ lần đầu:** bổ sung trạng thái/luồng theo `MainActivity`, thống nhất nơi lưu trạng thái với API. Không suy ra từ việc thiếu ảnh đơn thuần nếu tài khoản đã được đánh dấu hoàn tất.
2. **CSV:** Web hiện dùng template riêng, kiểm tra toàn bộ trước khi ghi và thêm mới. Android có cách ánh xạ cột, cập nhật/bỏ qua và xử lý lỗi từng dòng ở từng luồng. Cần bộ file mẫu thật cho Admin, môn, sinh viên, người nhận; không quảng bá rằng mọi CSV Android nhập thẳng được vào Web.
3. **Báo cáo → email:** cần truyền đúng báo cáo ngày/học kỳ và bộ lọc sang bước gửi. Nút xuất CSV trên Email hiện chỉ chuẩn bị lịch sử môn, chưa phải toàn bộ sự liên thông này.
4. **Lịch và điểm danh:** mô hình nhiều ca, ngày cho phép điểm danh, trạng thái vắng, bảo toàn lịch sử khi bỏ môn và quyền sửa lịch cần chốt lại theo Android/API. Android chặn trùng theo sinh viên/môn/ngày; Web hiện chặn theo sinh viên/môn/ngày/ca. Đây là sai khác còn phải sửa, đặc biệt khi một môn có nhiều ca cùng ngày: tổng hợp theo ngày có thể đếm thừa lượt của một người. Các chặn bổ sung của prototype không tự trở thành nghiệp vụ được duyệt.
5. **Validation hồ sơ:** các trường đã có UI nhưng chưa khẳng định mọi ràng buộc trùng Android, ví dụ điện thoại 10 số ở đăng ký Admin. Đối chiếu từng form khi chuẩn hóa dữ liệu server.
6. **Chức năng phụ thuộc:** reset qua email, gửi báo cáo, chống trùng mặt, liveness, xác thực nhạy cảm, backup mã hóa và đồng bộ cần module/dịch vụ thật. Hoàn thành giao diện không đồng nghĩa hoàn thành những chức năng này.

## 4. Những phần đã có trên Web nhưng không được dùng làm bằng chứng Android có sẵn

- Trang Hôm nay tổng hợp lịch; dữ liệu phòng học/lớp hành chính của prototype; nhiều ca học có ID riêng.
- Nhật ký thao tác local, kịch bản mạng chậm/lỗi, liveness giả lập, reset dữ liệu demo.
- Giữ lịch sử sau khi bỏ sinh viên khỏi môn; chặn sửa lịch đã có điểm danh; khóa một số thao tác theo vai trò ở domain Web.
- Danh sách backup JSON theo phiên, tải JSON và kiểm tra cấu trúc; đây không phải giải mã file backup Android.

Các mục này đã tồn tại trong prototype trước đợt rà soát. Được ghi riêng để nhóm không lấy chúng làm yêu cầu backend mặc định. Đợt này chưa mở thêm nhóm nghiệp vụ cải tiến mới.

## 5. Thay đổi UI/UX trong đợt rà soát

- Giữ nhận diện màu/logo Android, dùng font hệ thống; thay Lucide bằng Phosphor qua một file export dùng chung.
- Danh sách mobile dùng hàng phân cách, tên mở chi tiết; bỏ icon mũi tên trùng chức năng, chỉ giữ sửa/xóa khi được phép.
- Giảm độ nặng của nút phụ, khoảng cách và phần đầu trang; giữ mỗi vùng một nút chính.
- Hộp thoại có vùng cuộn riêng, tiêu đề và chân nút không cuộn cùng form; điều khiển tối thiểu 44px, chữ input 16px, giữ focus.
- Tabbar dưới cho điện thoại, sidebar cho desktop; giữ khung oval và video inline của camera.

Tham khảo đã đọc: [frontend-design của Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md). Áp dụng cách chọn thiết kế theo tác vụ, giảm câu chữ mẫu và đánh giá ảnh render; chưa cài skill vào máy. Icon: [Phosphor React](https://github.com/phosphor-icons/react). Không thêm shadcn hay một UI kit thứ hai chỉ để đổi phong cách.

## 6. Cách kiểm tra lại

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:ui
npm.cmd run test:webkit
```

Chạy hai bộ Playwright tuần tự vì dùng chung cổng test. Screenshot nằm trong `test-results`, bị thay thế khi chạy lượt tiếp theo. Mở `/#/app` để thử nghiệp vụ, `/#/camera` để xem camera riêng, `/#/ui-kit` để xem component.

Kiểm thử tự động bao gồm CRUD, quyền demo, CSV, điểm danh giả lập, không dùng kết quả cũ sau đổi môn, email lỗi/thử lại, backup/restore, reset mật khẩu, hồ sơ cá nhân, chọn người nhận, báo cáo và responsive. Phát hiện khuôn mặt qua webcam thật, bàn phím iOS, Safari iPhone và trình duyệt trong Zalo cần kiểm tra trên thiết bị; WebKit chạy trên Windows không xác nhận thay cho các trường hợp đó.

Kết quả lượt rà soát này: lint/build đạt; 14/14 unit test đạt; lượt WebKit cuối đạt 16/16. Chrome desktop/mobile: lượt đầu 31/32, phát hiện lỗi checkbox chọn tất cả nằm trong header bảng bị ẩn; sau sửa, 4/4 bài chạy lại cho chọn người nhận và toàn bộ màn hình đạt. Đã mở screenshot desktop và mobile để kiểm tra danh sách, form và điểm danh. Một lượt WebKit bị tải lại trang giữa bước reset khi đang sửa tài liệu; chạy riêng hai lần và lượt cuối đầy đủ đều đạt. Không sửa file trong khi chạy các lượt xác nhận cuối.
