# Bàn giao frontend trước tích hợp server và liveness

## 1. Trạng thái bản hiện tại

Bộ UI chung đã có token, component, responsive, form, bảng và hộp thoại giữ focus. Bản nghiệp vụ trong `src/portal` phát triển trên bộ nền đó, có điều hướng và dữ liệu thử nghiệm lưu tại trình duyệt. Đây là bản demo FE để kiểm tra luồng và tiếp tục phát triển theo module.

Bố cục sản phẩm đã được chỉnh theo hướng mobile trước: `PortalShell.jsx` quản lý header, thanh điều hướng dưới, menu và sidebar desktop; `mobile-first.css` quản lý bố cục. Hướng thiết kế bắt buộc nằm ở `DESIGN.md`, quy tắc cho agent ở `AGENTS.md`. Phần `AppShell` bên dưới là API của UI kit để tham khảo; portal không lồng AppShell vào PortalShell.

Các thay đổi nghiệp vụ hiện nằm trong workspace; tài liệu này không chứng minh đã commit, push hoặc triển khai lên server. `openapi.yml` đang có trong thư mục được giữ nguyên; chưa được dùng để gọi API trong giai đoạn này.

## 2. Chạy và truy cập

Chuẩn bị Node.js 22, npm và Git. Tại thư mục `iris-aegis-web`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Dùng địa chỉ Vite in trong terminal. Trang `/` mở bản quản lý; camera độc lập ở `/#/camera`. Bộ mẫu chung vẫn ở `/#/ui-kit`.

| Tài khoản mẫu | Vai trò | Mật khẩu |
|---|---|---|
| `super@demo.test` | Super Admin | `Demo@123` |
| `lan@demo.test` | Giảng viên Lan, có môn WEB301 | `Demo@123` |
| `nam@demo.test` | Giảng viên Nam, có môn CSDL201 | `Demo@123` |

Sinh viên mẫu dùng mật khẩu điểm danh `123456`. Không có tài khoản sinh viên tự đăng ký/đăng nhập.

Giữ lại dữ liệu sau reload bằng `localStorage`; phiên đăng nhập demo nằm ở `sessionStorage`. Dữ liệu và mật khẩu demo có thể đọc/sửa từ trình duyệt, nên chỉ dùng thông tin thử nghiệm. Không có cơ chế bảo mật server trong bản này. Khi rời khu vực portal sang UI kit/camera rồi quay lại, dữ liệu đã lưu và phiên demo được đọc lại; kịch bản kết nối trở về mặc định thành công.

## 3. Các màn hình và mức hoàn thành

| Màn hình / route | Thao tác có thể thử | Phần còn chờ |
|---|---|---|
| `/#/app/login`, `forgot`, `reset` | Đăng nhập, đăng xuất, reset qua mã/hộp thư demo, bước mặt giả lập khi tài khoản có ảnh. | API auth/phiên/reset/email; đối sánh và liveness thật. |
| Khởi tạo lần đầu | Khi chưa có Admin, đăng nhập mở form khởi tạo Super Admin; Thiết lập demo cũng có thể nạp lại trạng thái khởi tạo. | Quy tắc bootstrap và xác thực do server kiểm soát. |
| `/#/app/home` | Lịch hôm nay theo lịch mẫu và tiến độ điểm danh. | Lịch dạy là đề xuất Web; dữ liệu/mô hình cần thống nhất. |
| `/#/app/courses` và `courses/:id` | CRUD, tìm/lọc, import, phân công, lịch; danh sách lớp, gán/bỏ sinh viên, tạo/import vào môn. | API môn/enrollment; rule lịch, quyền, xóa và lịch sử. |
| `/#/app/students` và `students/:id` | CRUD, tìm/lọc, import/export, chi tiết, chọn/chụp/bỏ ảnh. | API hồ sơ và lưu ảnh; kiểm tra trùng thật. |
| `/#/app/admins`, `admins/new` và `admins/:id` | Super Admin xem/tạo/sửa/xóa Admin, mở chi tiết và nhập CSV; Admin thường bị chặn khỏi quản lý Admin. | API tài khoản, email thông báo và kiểm tra quyền thật. |
| `/#/app/profile` | Sửa thông tin, ảnh, mật khẩu demo; xác nhận mật khẩu hiện tại khi đổi mật khẩu. | API hồ sơ, xác minh khi đổi ảnh/mật khẩu. |
| `/#/app/attendance` | Chọn danh sách/nhập mã trên thiết bị chung → mật khẩu → camera → liveness/đối sánh giả lập → lưu demo; chuyển sinh viên tiếp theo. | Liveness Nhóm 4, đối sánh, API điểm danh và chống trùng server. |
| `/#/app/reports` | Theo buổi, lịch sử, học kỳ, lọc, tỷ lệ có mặt, CSV đang lọc. | Quy tắc buổi/vắng/muộn và báo cáo chuẩn của server. |
| `/#/app/email` | Người nhận CRUD/import, xem trước đính kèm, gửi và lịch sử giả lập. | Gửi email thật, hàng đợi/trạng thái email, API người nhận. |
| `/#/app/backups` | Tạo, tải, chọn/kiểm tra file, khôi phục, xóa bản demo trong phiên; xác nhận mật khẩu. | Backup server/mã hóa; không tương thích SQLite/backup Android. |
| `/#/app/settings` | Kịch bản thành công/chậm/lỗi, nạp lại mẫu/khởi tạo, nhật ký cục bộ, trạng thái iris. | Nhật ký bảo mật, Iris và phương án thay xác nhận thiết bị. |

CRUD lưu cục bộ; báo lỗi nếu không thể ghi hoặc quá dung lượng. CSV nhập chỉ thêm mới, kiểm tra toàn bộ trước khi ghi; không lưu nếu có dòng lỗi. Mẫu CSV do Web định nghĩa cho demo, chưa cam kết đọc nguyên file Android. Export tránh các ô mở đầu bằng công thức bảng tính.

## 4. Luồng demo nên trình diễn

1. Đăng nhập Super Admin → mở Môn học → WEB301 → xem sinh viên và lịch.
2. Thêm sinh viên hoặc gán hồ sơ có sẵn vào môn; thử import CSV sai rồi hợp lệ.
3. Chọn sinh viên chưa điểm danh → nhập `123456` → chụp và sử dụng ảnh. Nếu chỉ thử UI trên máy không có webcam, chọn “Dùng kịch bản không camera (giả lập)”.
4. Chọn kịch bản liveness không đạt/không khớp để xem lỗi, sau đó chọn đạt và xác nhận demo.
5. Kiểm tra báo cáo và CSV; thử email lỗi bằng Thiết lập demo, sau đó chuyển Thành công và thử lại.
6. Tạo và tải backup JSON; sửa dữ liệu rồi thử khôi phục. Sau khôi phục cần đăng nhập lại.
7. Đăng nhập giảng viên Lan, kiểm tra chỉ thấy phạm vi môn được giao và không mở được quản trị Admin/backup.

Đổi ngày, môn hoặc sinh viên phải hủy bước chờ cũ; không lấy kết quả xác thực của sinh viên trước để ghi sinh viên sau. Mỗi người chỉ có một bản ghi trên môn/ngày/ca trong domain demo.

## 5. File nào thuộc ai

| File/khu vực | Trách nhiệm | Phối hợp |
|---|---|---|
| `src/ui`, `src/showcase`, `UI-GUIDELINES.md` | Bộ nền, token, component và ví dụ | Trưởng nhóm duy trì; thành viên đề xuất bổ sung bằng PR. |
| `src/Auth/Auth.jsx` | Đăng nhập, khởi tạo Super Admin và reset demo | @MP-1611 |
| `src/Auth/AdminCreate.jsx` | Màn tạo Admin riêng, dùng lại validation/domain của portal | @MP-1611 |
| `src/portal/Auth.jsx` | Re-export tương thích của màn auth | @MP-1611 |
| `src/portal/Catalog.jsx` | Form và danh sách Admin/môn/sinh viên, chi tiết/enrollment | Đang gom nhiều module. @MP-1611, @VoVanKiet-2005, @quangchien11 phải chia file hoặc thống nhất người sửa trước khi làm song song. |
| `src/App.jsx`, `camera-crop.js`, `portal/shared.jsx` (`PhotoField`, `FaceFlow`) | Camera, trả ảnh và bước xác thực giả lập | @thang-nghien-dua phối hợp người gọi camera. |
| `src/portal/Attendance.jsx` | Hôm nay, điểm danh và báo cáo | @vanphil207; phần Hôm nay phối hợp @VoVanKiet-2005. |
| `src/portal/Operations.jsx` | Email, backup và thiết lập demo | @vantien68; thiết lập dùng chung trao đổi trưởng nhóm. |
| `src/portal/domain.js`, `Store.jsx`, `csv.js` | Validation, quan hệ, lệnh ghi, lưu dữ liệu, tác vụ giả lập và CSV | Trưởng nhóm điều phối thay đổi, tránh mỗi màn tạo kho dữ liệu riêng. |
| `Workspace.jsx`, `portal/Portal.jsx` | Điều hướng và phạm vi màn hình | Trưởng nhóm tích hợp; hiện dùng hash, chưa dùng React Router. |

Chưa có Axios, Zustand/Redux hoặc PWA runtime trong bản này. State nghiệp vụ dùng Context/useState và localStorage; build dùng Vite, CSS dùng token chung trên nền CSS hiện có. Những công nghệ còn lại trong stack là hạng mục tiếp theo khi cần, không đánh dấu đã tích hợp.

## 6. Cách tái sử dụng UI và camera

Màn mới import component từ `../ui`; render trong `AppShell` có wrapper `.aegis-ui`. CSS riêng dùng lớp theo module và biến `--ui-*`; không sửa global `button`, `body`, `h1`. Ví dụ và danh sách props ở `UI-GUIDELINES.md`.

Trong portal, trang được render vào `PortalShell` có sẵn `.aegis-ui`, không tạo thêm shell. Mobile có 4 tác vụ chính và nút Thêm; chức năng phụ và đăng xuất nằm trong menu. Chỉ dùng một nhãn Demo ở header, thông báo chi tiết đặt tại thao tác xác thực/gửi hoặc trong thiết lập.

```jsx
import { Button, PageHeader } from '../ui'

export function ExamplePage({ onCreate }) {
  return <PageHeader title="Môn học"
    actions={<Button onClick={onCreate}>Thêm môn học</Button>} />
}
```

Camera tái sử dụng component hiện tại:

```jsx
import CameraApp from '../App.jsx'

export function CaptureStep({ onPhoto }) {
  return <CameraApp embedded onCapture={onPhoto} />
}
```

`onCapture` nhận JPEG data URL sau khi người dùng bấm “Sử dụng ảnh này”. Camera đã dừng track khi chụp; unmount cũng dừng camera và detector. `PhotoField` thu nhỏ ảnh để lưu demo; `FaceFlow` điều phối kịch bản kiểm tra, không có thuật toán liveness. Chưa có callback MediaStream cho module Nhóm 4; cần tách controller camera sau khi thống nhất giao diện module, tránh mở hai stream hoặc hai detector.

## 7. Điểm chuyển sang tích hợp thật

| Điểm hiện tại | Việc làm khi tích hợp |
|---|---|
| `Auth.jsx` + `Store.login/logout` | Thay so mật khẩu demo bằng service auth; định nghĩa phiên/hết hạn và quyền từ server. Không gửi nguyên database demo. |
| `Store.write` → `domain.command` | Giữ validation UI cần thiết; chuyển lệnh CRUD thành service theo module. Bổ sung pending/error/refetch cho dữ liệu thật. `command` không bảo vệ dữ liệu server. |
| `simulate(signal)` | Hiện chỉ delay/lỗi giả lập; thay bằng request có abort theo tài liệu API, không dùng làm API client. |
| `FaceFlow` | Nhận kết quả module Nhóm 4 và dịch vụ đối sánh riêng; challenge, TTL, evidence và retry theo thiết kế được thống nhất. Không tin cờ `simulated` hoặc lựa chọn pass trên UI. |
| `Attendance.save` | Server xác minh người/buổi và chống trùng; thời gian và quyết định chấp nhận do server kiểm soát. |
| Ảnh data URL, CSV và backup JSON | Thống nhất Blob/File, kiểu upload, định dạng import và quyền truy cập với nhóm liên quan; không giả định endpoint hoặc schema. |

Các service thật chưa được triển khai. `openapi.yml` cần được rà soát riêng trước khi ánh xạ field, role, lỗi và endpoint. Liveness và nhận diện là hai phụ thuộc khác nhau.

## 8. Đề xuất cải thiện cần xác nhận

- **Đã thử ở FE:** hàng chờ/sinh viên tiếp theo; xem trước CSV và chặn nhập khi có lỗi; cảnh báo phạm vi xóa; các trạng thái camera, kịch bản lỗi và thử lại; xem trước email, lịch sử gửi demo.
- **Cần backend:** phiên học có định danh và chống trùng nguyên tử; snapshot danh sách/lịch để báo cáo không đổi khi sửa lịch hoặc bỏ môn; phiên bản ảnh/embedding; kết quả liveness và đối sánh gắn với lần xác thực có hạn dùng; import có báo cáo từng dòng; trạng thái job gửi email và backup.
- **Phần khác Android:** lịch hôm nay, phòng, nhiều ca có cấu trúc, backup Web JSON. Các phần này là đề xuất prototype, không mô tả là Android đã có.
- **Rule demo:** muộn sau giờ bắt đầu; vắng sau khi ca kết thúc; không tính tương lai. Android tổng hợp học kỳ từ ngày có điểm danh, nên số liệu demo không mặc định bằng Android. Ngưỡng cảnh báo vắng chưa được chuẩn hóa/triển khai riêng trong bản này.
- Khi bỏ môn, demo giữ lịch sử; bảng lịch sử còn bản ghi, nhưng tổng hợp theo enrollment hiện tại. Muốn thống kê lịch sử đầy đủ cần snapshot phía backend.

## 9. Kiểm tra và tiêu chí PR

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:ui
npm.cmd run build
```

Test UI cần Chrome cài trên máy và cổng 5187 trống. Test chạy viewport desktop 1440×1000, mobile 390×844; không chứng minh Safari/iPhone thật hoặc camera phần cứng. Ảnh/trace nằm trong `test-results/`.

Kết quả kiểm tra bản bàn giao ngày 15/11/2026: lint và build đạt; 11 test logic đạt; 26 lượt kiểm thử trình duyệt đạt (13 tình huống trên hai viewport). Có kiểm tra hồi quy đổi môn khi đang xác thực để không dùng phản hồi cũ; đã xem ảnh desktop/mobile và sửa bố cục tên môn trên mobile. Bộ kiểm thử chưa bao phủ mọi tổ hợp dữ liệu, lỗi thiết bị hoặc mọi trường form.

Bổ sung sau khi chỉnh bố cục mobile: bộ Chrome có 28 lượt kiểm thử; bộ WebKit riêng có 14 bài và đã chạy đạt 14/14 với cấu hình iPhone 13. Lỗi WebKit không trả focus về nút mở modal đã được sửa trong component chung. Chạy `npm.cmd run test:webkit`, thêm `-- --headed --workers=1` để xem trình duyệt hoặc `-- --ui` để mở giao diện Playwright. Các bộ dùng chung cổng 5187 nên chạy tuần tự. Chưa xác nhận camera phần cứng/Safari iPhone thật.

PR phải có màn hình/luồng đã đổi, Activity Android tham chiếu, phần đề xuất mới, ảnh desktop/mobile, kết quả lệnh kiểm tra và phụ thuộc chưa tích hợp. Khi sửa token/component/controller dùng chung, trao đổi trưởng nhóm và cập nhật mẫu/tài liệu. Không đánh dấu hoàn thành tích hợp server, liveness hoặc đối sánh trước khi test với dịch vụ/module thật.
