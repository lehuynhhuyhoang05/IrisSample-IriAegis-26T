## Mục tiêu

Đưa đầy đủ chức năng và luồng nghiệp vụ của ứng dụng Android lên Web, bắt đầu bằng UI/UX và các luồng thao tác tuần 2; chuẩn bị tích hợp module liveness của Nhóm 4 và API của Nhóm 1.

Hiện chưa có API document và module liveness hoàn chỉnh. Các phần phụ thuộc được phát triển bằng dữ liệu hoặc kết quả giả lập, có đánh dấu rõ trên giao diện và khi báo cáo.

## Công việc

### 1. Khảo sát và thiết kế UI/UX
- [ ] Lập bảng đối chiếu đầy đủ chức năng, màn hình, vai trò và luồng Android → Web; theo dõi trạng thái từng mục.
- [ ] Bao quát khởi tạo Super Admin, đăng nhập/xác thực mặt, đăng xuất, quên và đặt lại mật khẩu, hồ sơ.
- [ ] Bao quát quản trị viên, môn học/lịch học, sinh viên/đăng ký môn, tìm kiếm/lọc, phân quyền và nhập CSV tương ứng.
- [ ] Bao quát đăng ký/chọn ảnh mặt và kiểm tra trùng; các biến thể điểm danh hiện có.
- [ ] Bao quát lịch sử, lọc/thống kê, xuất CSV, người nhận và gửi email báo cáo.
- [ ] Bao quát sao lưu/khôi phục và ghi nhận riêng chức năng Iris, TODO hoặc phụ thuộc phần cứng.
- [ ] Xác định tiến độ và phần phụ thuộc trong tuần; không loại bỏ chức năng Android khỏi mục tiêu tổng thể.
- [ ] Thiết kế giao diện responsive cho máy tính, Android và iPhone.
- [ ] Xây dựng giao diện và điều hướng cho các màn hình ưu tiên; sử dụng dữ liệu mẫu khi chưa có API.
- [ ] Bổ sung các trạng thái đang tải, dữ liệu rỗng và lỗi phù hợp.

### Quy chuẩn giao diện chung — áp dụng cho tất cả thành viên

Bộ UI chung đã được bàn giao trên [nhánh HuyHoang](https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp/tree/HuyHoang). Tất cả thành viên sử dụng bộ nền này và [hướng dẫn phát triển UI](https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp/blob/HuyHoang/UI-GUIDELINES.md) để triển khai phần được giao. Trưởng nhóm duy trì theme, token, component và mẫu giao diện; thành viên phát triển màn hình nghiệp vụ dựa trên các tài nguyên chung.

**Trưởng nhóm — phụ trách thiết lập và duy trì quy chuẩn:**
- [ ] Đối chiếu app Android, prototype camera, `DESIGN-TOKENS.md` và `src/android-tokens.css`; xây dựng và công bố quy chuẩn màu, chữ, khoảng cách, bo góc, icon và bố cục dùng chung.
- [ ] Định nghĩa mẫu responsive cho máy tính và điện thoại Android/iPhone; hướng dẫn cách kiểm thử và ghi nhận thiết bị, trình duyệt thực tế.
- [ ] Xây dựng và tài liệu hóa các component nền dùng chung: header/navigation, nút, ô nhập, danh sách/bảng, hộp thoại, thông báo, trạng thái loading/rỗng/lỗi và camera khi cần.
- [ ] Quy định cách thể hiện thành công, lỗi, cảnh báo, xác nhận xóa và nội dung giả lập; tiêu chí về chữ, độ tương phản, thao tác chạm và focus.
- [ ] Công bố hướng dẫn trước khi các thành viên triển khai màn hình; tiếp nhận đề xuất, cập nhật quy chuẩn và review tính nhất quán của các pull request UI.

**Các thành viên — áp dụng quy chuẩn vào phần được giao:**
- [ ] Đọc hướng dẫn và sử dụng token, mẫu responsive, component chung do trưởng nhóm công bố.
- [ ] Trao đổi với trưởng nhóm khi thiếu component hoặc cần bổ sung, thay đổi quy chuẩn; tránh tự tạo biến thể không thống nhất.
- [ ] Kiểm tra giao diện trên thiết bị/trình duyệt sẵn có, ghi rõ kết quả và những trường hợp chưa kiểm thử.
- [ ] Pull request có thay đổi UI cần kèm ảnh/video minh họa và tự kiểm tra theo quy chuẩn chung trước khi gửi review.

#### Hướng dẫn sử dụng bộ UI chung

**1. Lấy source và xem mẫu trước khi làm màn hình**

Với máy chưa có repository, chuẩn bị Node.js 22 và Git, sau đó chạy trong PowerShell:

```powershell
git clone --branch HuyHoang https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp.git
cd IrisSample-IriAegis-26T-WebApp
npm.cmd ci
npm.cmd run dev
```

Mở địa chỉ Vite hiển thị trong terminal, thêm đường dẫn:

| Đường dẫn | Nội dung tham khảo |
|---|---|
| `/#/ui-kit` | Màn hình sinh viên mẫu: tìm kiếm, lọc, form, xác nhận xóa và xuất CSV. |
| `/#/ui-kit/components` | Các component chung và trạng thái tương tác. |
| `/#/ui-kit/foundation` | Màu, chữ, khoảng cách, icon và bố cục responsive. |
| `/#/ui-kit/guide` | Hướng dẫn triển khai màn hình. |
| `/` hoặc `/#/camera` | Prototype camera hiện tại. |

Mẫu sinh viên sử dụng dữ liệu giả lập, chỉ là ví dụ UI; không thay thế đặc tả nghiệp vụ Android. Thành viên đã có source cần lưu công việc đang làm trước khi cập nhật nhánh. Tạo nhánh riêng từ bản nền đã cập nhật, ví dụ `git switch -c ten-thanh-vien/quan-ly-mon-hoc`; không cùng sửa trực tiếp trên nhánh bàn giao `HuyHoang`. Khi gửi PR, chọn nhánh đích theo phân công của trưởng nhóm.

**2. Sử dụng đúng lớp theme và CSS token**

| Tài nguyên | Cách sử dụng |
|---|---|
| [`src/android-tokens.css`](https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp/blob/HuyHoang/src/android-tokens.css) | Giá trị trích xuất từ Android để kế thừa và truy vết; không tự sửa theo từng màn hình. |
| [`src/ui/tokens.css`](https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp/blob/HuyHoang/src/ui/tokens.css) | Token theo vai trò sử dụng trên Web; ưu tiên dùng các biến `--ui-*` khi viết CSS mới. |
| [`src/ui/ui.css`](https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp/blob/HuyHoang/src/ui/ui.css) | Style component và responsive dùng chung. |
| [`src/ui`](https://github.com/lehuynhhuyhoang05/IrisSample-IriAegis-26T-WebApp/tree/HuyHoang/src/ui) | Component và khung trang để tái sử dụng. |

Thứ tự nạp CSS cho khu vực UI mới, ví dụ nếu tập trung tại `src/main.jsx`:

```jsx
import './android-tokens.css'
import './ui/tokens.css'
import './ui/ui.css'
```

Source hiện tại đã nạp token Android tại `main.jsx` và hai file UI tại `Showcase.jsx`. Không cần thêm lại vào từng màn hình. Nếu tổ chức lại điểm khởi tạo, trưởng nhóm chuyển các import về vị trí chung tương ứng.

**Các biến `--ui-*` và style component được giới hạn trong `.aegis-ui`.** `AppShell` đã cung cấp lớp này. Trang nghiệp vụ cần nằm bên trong `AppShell`; không lồng thêm một `AppShell` cho mỗi phần nội dung. Khi dựng màn hình độc lập để thử component, dùng phần tử bao có `className="aegis-ui"` và bảo đảm đã nạp CSS chung.

| Nhóm token | Dùng cho |
|---|---|
| `--ui-action`, `--ui-action-hover` | Hành động chính và hover. Dùng `Button` khi là nút thao tác. |
| `--ui-brand` | Màu nhận diện mint; không tự thay thế màu nút chính. |
| `--ui-text`, `--ui-muted`, `--ui-font` | Chữ chính, chữ phụ và font hệ thống. |
| `--ui-surface`, `--ui-canvas` | Bề mặt nội dung và nền trang. |
| `--ui-border`, `--ui-control-border` | Đường phân cách và viền ô nhập. |
| `--ui-success`, `--ui-warning`, `--ui-danger`, `--ui-info` | Màu trạng thái, đi kèm token nền `-bg` tương ứng. |
| `--ui-space-1` đến `--ui-space-6`, `--ui-space-8`, `--ui-space-10` | Khoảng cách 4, 8, 12, 16, 20, 24, 32, 40 px. |
| `--ui-radius-sm`, `--ui-radius-md`, `--ui-radius-lg` | Bo góc 6, 8, 12 px. |
| `--ui-control-height`, `--ui-focus` | Chiều cao control và dấu hiệu focus. |

Ví dụ CSS riêng của một màn hình, đặt bên trong khung UI chung:

```css
.aegis-ui .subjects-page__form {
  display: grid;
  gap: var(--ui-space-4);
  color: var(--ui-text);
}

.aegis-ui .subjects-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-3);
  padding-top: var(--ui-space-4);
  border-top: 1px solid var(--ui-border);
}
```

Không tự gán mã màu, font, bóng đổ hoặc theme riêng cho màn hình. Không ghi đè selector toàn cục như `body`, `button`, `input`, `h1`. CSS đặc thù dùng tên lớp theo chức năng và token chung; nếu thiếu token hoặc biến thể, đề xuất trưởng nhóm bổ sung vào bộ nền.

**3. Tái sử dụng component thay vì dựng lại**

Import từ `src/ui/index.js`. Ví dụ trong file `src/pages/SubjectForm.jsx`, form dưới đây được render bên trong `AppShell` và nhận hàm lưu từ màn hình điều phối:

```jsx
import { useState } from 'react'
import { Button, Field, Notice, PageHeader } from '../ui'

export default function SubjectForm({ onSave }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Vui lòng nhập tên môn học.')
      return
    }
    setError('')
    onSave({ name: name.trim() })
  }

  return <>
    <PageHeader title="Thêm môn học" description="Nhập thông tin môn học." />
    <Notice tone="info" title="Dữ liệu giả lập">
      Chức năng đang dùng dữ liệu mẫu, chưa kết nối server.
    </Notice>
    <form className="subjects-page__form" onSubmit={handleSubmit}>
      <Field
        label="Tên môn học"
        value={name}
        onChange={event => setName(event.target.value)}
        error={error}
        required
      />
      <div className="subjects-page__actions">
        <Button type="submit">Lưu môn học</Button>
      </div>
    </form>
  </>
}
```

Đây là ví dụ cách dùng component, không phải form môn học đầy đủ. Thành viên bổ sung trường và validation theo nghiệp vụ đã đối chiếu; `onSave` do luồng cha cung cấp, có thể gọi service giả lập trong giai đoạn này.

- Nút: `Button`, `IconButton`; dùng variant `primary`, `secondary`, `quiet`, `danger` của `Button` theo hành động.
- Form/tìm kiếm: `Field`, `SearchField`; luôn có nhãn và lỗi tại trường tương ứng.
- Danh sách: `DataTable`; tham khảo cấu hình cột và cách hiển thị mobile ở trang mẫu.
- Trạng thái: `Badge`, `Notice`, `EmptyState`, `LoadingState`.
- Tiêu đề/khung trang/hộp thoại: `PageHeader`, `AppShell`, `Dialog`; dùng hộp thoại xác nhận khi xóa.
- Icon thao tác dùng `lucide-react` đã có trong project; logo dùng asset Android đã bàn giao, không thêm bộ icon hoặc logo riêng.
- Camera hiện tại chưa phải component dùng chung hoàn chỉnh; việc tách camera thuộc phần công việc Camera và liveness phía dưới.

**4. Checklist trước khi gửi PR giao diện**

- [ ] Màn hình dùng đúng `AppShell`/`.aegis-ui`, component và token chung; không tạo theme riêng.
- [ ] Không tự thay đổi `src/ui`, token Android hoặc mẫu chung; nếu cần thay đổi đã trao đổi với trưởng nhóm và ghi rõ trong PR.
- [ ] Bố cục rõ thứ tự thao tác, tránh lồng nhiều khung/card, gradient và hiệu ứng trang trí không phục vụ chức năng.
- [ ] Có trạng thái đang tải, rỗng, lỗi và thành công phù hợp; dữ liệu/kết quả giả lập được đánh dấu.
- [ ] Kiểm tra các chiều rộng tham chiếu 360, 768 và 1440 px; không tràn ngang, nút dễ chạm, form có nhãn và focus bàn phím rõ.
- [ ] Đính kèm ảnh/video desktop và mobile; ghi rõ trình duyệt, thiết bị thật hoặc mô phỏng. Thu nhỏ cửa sổ không được ghi là đã kiểm thử Safari iPhone thật.
- [ ] Chạy các kiểm tra hiện có (`npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`); chạy kiểm thử UI khi thay đổi component/luồng liên quan theo `UI-GUIDELINES.md`.
- [ ] Ghi màn hình đã hoàn thành, phần chưa làm và phụ thuộc API/liveness; gửi trưởng nhóm review tính nhất quán trước khi hợp nhất.

### 2. Camera và liveness
- [ ] Tách hoặc tổ chức camera để dùng lại trong các luồng cần chụp khuôn mặt.
- [ ] Chuẩn bị vị trí tích hợp module liveness của Nhóm 4.
- [ ] Xây dựng trạng thái giả lập: chưa bắt đầu, đang kiểm tra, thành công, thất bại và thử lại.
- [ ] Thống nhất với Nhóm 4 môi trường chạy, đầu vào, kết quả và khả năng dùng chung camera.

### 3. Chuẩn bị kết nối server
- [ ] Tách xử lý giao diện, nghiệp vụ và tầng gọi API.
- [ ] Chuẩn bị luồng chuyển ảnh sau khi chụp sang định dạng phù hợp để tích hợp khi có đặc tả.
- [ ] Mô phỏng các trạng thái đang gửi, thành công, thất bại và thử lại.
- [ ] Tổng hợp nhu cầu API để trao đổi với Nhóm 1 khi có tài liệu.

### 4. Kiểm thử và bàn giao
- [ ] Kiểm thử các màn hình và luồng đã chọn trên các thiết bị, trình duyệt sẵn có.
- [ ] Ghi rõ kết quả kiểm thử và các phần đang dùng dữ liệu giả lập.
- [ ] Cập nhật hướng dẫn chạy, danh sách phần đã làm và nội dung phụ thuộc nhóm khác.

## Phân công

Nhóm gồm **7 người: 1 trưởng nhóm và 6 thành viên**. Phân công đề xuất theo module dưới đây; các phần chưa có API hoặc module liveness sử dụng dữ liệu/kết quả giả lập và phải ghi rõ khi demo.

| Thành viên | Nội dung phụ trách | Kết quả bàn giao |
|---|---|---|
| **Trưởng nhóm: Lê Huỳnh Huy Hoàng — @lehuynhhuyhoang05** | Thiết lập và duy trì theme, CSS token, component chung, khung trang và điều hướng; đối chiếu phạm vi Android → Web; thống nhất cách tổ chức code và tích hợp các module; review UI và PR. | Bộ UI dùng chung, trang mẫu và hướng dẫn sử dụng; bảng đối chiếu chức năng; bản Web tích hợp các phần của nhóm; danh sách cải thiện FE và đề xuất cần backend hỗ trợ. |
| **@MP-1611** | **Tài khoản, hồ sơ và quản trị viên:** khởi tạo Super Admin; đăng nhập/đăng xuất; quên/đặt lại mật khẩu; xem/sửa hồ sơ; danh sách, chi tiết, thêm/sửa/xóa Admin và nhập CSV; thể hiện quyền Super Admin/Admin. Tái sử dụng camera của thành viên phụ trách camera khi cần đăng ký/xác thực ảnh. | Các màn hình và luồng tài khoản/quản trị có thể thao tác bằng dữ liệu mẫu; validation form, lỗi đăng nhập và trạng thái không có quyền; kiểm thử theo hai vai trò. Chưa triển khai tài khoản tự đăng ký cho sinh viên. |
| **@VoVanKiet-2005** | **Môn học và lịch học:** danh sách, tìm kiếm/lọc, chi tiết, thêm/sửa/xóa môn, nhập CSV; học kỳ, thời gian học, phân công giảng viên và hiển thị theo quyền. **Đề xuất Web:** phòng học, nhiều ca có cấu trúc và lịch dạy hôm nay. | Module môn/lịch responsive, form và validation; cảnh báo khi xóa môn; liên kết danh sách lớp, điểm danh và báo cáo; phối hợp với @quangchien11. |
| **@quangchien11** | **Sinh viên và đăng ký môn:** danh sách, chi tiết, thêm/sửa/xóa, tìm kiếm/lọc, nhập CSV; gán sinh viên có sẵn vào môn và bỏ khỏi môn; đăng ký/cập nhật ảnh qua component camera hoặc chọn file; trạng thái kiểm tra trùng ảnh giả lập. | Module hồ sơ sinh viên và danh sách lớp; xem trước/lỗi nhập CSV; phân biệt rõ bỏ khỏi môn với xóa hồ sơ toàn hệ thống; dùng chung hồ sơ khi sinh viên học nhiều môn. |
| **@thang-nghien-dua** | **Camera và điểm tích hợp liveness:** tách camera dùng chung từ prototype; mở/dừng/chụp/xem ảnh/chụp lại, xử lý quyền và gián đoạn; giữ khung bầu dục; chuẩn bị đầu vào/đầu ra cho module Nhóm 4 và các trạng thái liveness/đối sánh giả lập. | Component camera dùng lại được và hướng dẫn tích hợp cho các thành viên; kết quả ảnh cùng callback hủy/thử lại; demo đạt/thất bại rõ nhãn giả lập; kiểm thử camera trên trình duyệt và Safari iPhone thật khi có thiết bị. |
| **@vanphil207** | **Điểm danh, lịch sử và báo cáo:** chọn môn/sinh viên hoặc nhập mã trên thiết bị chung, mật khẩu demo, camera/liveness, kết quả; lịch sử, lọc, thống kê và xuất CSV. **Đề xuất Web:** hàng chờ, sinh viên tiếp theo và chống trùng theo buổi/ca. | Luồng giả lập có thể thao tác; báo cáo lọc/xuất; ghi rõ quy tắc cần mentor và backend xác nhận. |
| **@vantien68** | **Email báo cáo, sao lưu và khôi phục:** người nhận, nhập CSV, gửi giả lập, backup/restore demo. **Đề xuất Web:** xem trước và lịch sử gửi email, danh sách backup đầy đủ, tải/xóa từng bản, chọn file khôi phục. | Module email và backup với trạng thái thành công/lỗi; phân biệt backup Web và Android; kết nối dữ liệu báo cáo của @vanphil207. |

### Đối chiếu chức năng Android và đề xuất Web

Các mục **đề xuất Web** cần mentor và nhóm liên quan thống nhất; không coi là chức năng Android đã có.

| Mục | Bằng chứng trong Android và kết luận |
|---|---|
| Tài khoản, hồ sơ, quản trị Admin và nhập CSV | Có trong `LoginActivity`, `ProfileActivity`, `AdminListActivity`, `RegisterAdminActivity`, `ForgotPasswordActivity`, `ResetPasswordActivity`. Login bằng mặt sau mật khẩu chỉ mở khi có ảnh hợp lệ; không có ảnh thì đi tiếp. |
| Môn học, giảng viên, thời gian và học kỳ | `AddSubjectActivity`, `SubjectListActivity`, `DatabaseHelper.createSubject()` có chuỗi thời gian học, phân công và ngày học kỳ. **Đề xuất Web:** phòng học, lịch dạy hôm nay, nhiều ca có cấu trúc. Bảng schedules cũ đã bị xóa; cần thống nhất mô hình với Nhóm 1. |
| Sinh viên, đăng ký môn, ảnh và nhập CSV | `StudentListActivity`, `StudentManagementActivity`, `AddStudentActivity`, `FaceCaptureActivity` có các luồng liên quan. Cách bỏ môn, xóa hồ sơ và giữ lịch sử cần đối chiếu từng luồng. **Đề xuất Web:** xem trước CSV và xử lý toàn bộ hoặc không lưu dòng nào. |
| Camera và liveness | Android có chụp/phát hiện/đối sánh khuôn mặt trong `FaceCaptureActivity`. **Mới:** liveness là yêu cầu Nhóm 4, chưa có trong Android; hỗ trợ Safari là yêu cầu Web. |
| Điểm danh, chống trùng và hàng chờ | `StudentListActivity` chặn trùng theo sinh viên/môn/ngày; `StudentManagementActivity` có luồng nhập mã và ghi điểm danh riêng. **Đề xuất Web:** hàng chờ, sinh viên tiếp theo và khóa trùng theo mã buổi/ca. Không mặc định các luồng Android dùng cùng rule. |
| Báo cáo và email | `AttendanceManagementActivity` có báo cáo ngày/học kỳ, xuất CSV, người nhận, gửi email; yêu cầu xuất CSV trước khi gửi. **Đề xuất Web:** xem trước email/đính kèm và lịch sử gửi; chưa thấy bằng chứng các phần đó có sẵn. |
| Backup/restore | `BackupRestoreActivity` backup mã hóa, khôi phục bản gần nhất, xóa tất cả; `showBackupsList()` có TODO và chỉ xem bản gần nhất. **Đề xuất Web:** danh sách đầy đủ, tải/xóa từng bản, chọn file Web và backup server. |
| Mống mắt và khóa thiết bị | Android có UI/mã liên quan nhưng module SDK iris bị comment; xác nhận thiết bị là luồng Android. Phương án Web, phần cứng và license cần xác nhận, chưa coi iris hoạt động. |

**Quy tắc báo cáo cần xác nhận:** `AttendanceManagementActivity.loadSemesterAggregateRecords()` tổng hợp theo các ngày có bản ghi điểm danh; không mặc định Android có lịch buổi đầy đủ hoặc tự tính vắng mọi buổi dự kiến. Rule chốt buổi, vắng/muộn và bảo lưu lịch sử cần mentor và Nhóm 1 thống nhất.

### Chú thích phụ thuộc theo chức năng

Bảng phân công đã bao phủ **các nhóm chức năng trong phạm vi issue**. Trưởng nhóm tiếp tục đối chiếu từng màn hình và thao tác Android để phát hiện thiếu sót; chưa khẳng định đã kiểm kê đầy đủ mọi nhánh trong code.

| Phần việc / người phụ trách | Có thể làm ngay trên frontend | Chờ tích hợp hoặc xác nhận |
|---|---|---|
| Tài khoản, hồ sơ, Admin — @MP-1611 | Form, điều hướng, phân quyền giao diện và các trạng thái bằng dữ liệu mẫu. | **Nhóm 1:** đăng nhập/phiên, quyền thực tế, tài khoản, hồ sơ, reset và email. Xác thực mặt thật còn phụ thuộc dịch vụ nhận diện/đối sánh; **Nhóm 4:** liveness nếu áp dụng cho đăng nhập. |
| Môn và lịch học — @VoVanKiet-2005 | Danh sách, form, lịch, phân công, CSV mẫu và validation. | **Nhóm 1:** CRUD, dữ liệu lịch/học kỳ, giảng viên, phân quyền và quy tắc xóa thực tế. |
| Sinh viên, đăng ký môn, ảnh — @quangchien11 | Hồ sơ, gán/bỏ môn, CSV, chụp/chọn và xem ảnh; mô phỏng trùng ảnh. | **Nhóm 1:** hồ sơ, đăng ký môn, tải/lưu ảnh và quyền. Kiểm tra trùng/đối sánh thật cần thống nhất với **Nhóm 3 và Nhóm 1**; **Nhóm 4:** liveness nếu áp dụng khi đăng ký ảnh. |
| Camera, liveness — @thang-nghien-dua | Camera trình duyệt, xem/chụp/chụp lại, xử lý quyền; mô phỏng đạt/thất bại. | **Nhóm 4:** module liveness, cách dùng camera và đầu vào/đầu ra. Gửi ảnh phụ thuộc đặc tả **Nhóm 1/Nhóm 3**. Phát hiện mặt không phải liveness. |
| Điểm danh, lịch sử, báo cáo — @vanphil207 | Chọn môn/buổi/sinh viên, luồng camera, lịch sử, lọc, thống kê và xuất CSV bằng dữ liệu mẫu. | **Nhóm 1:** buổi học, mật khẩu, ghi điểm danh, lịch sử, báo cáo và quy tắc tính trạng thái; **Nhóm 4:** liveness; **Nhóm 3/Nhóm 1:** đối sánh danh tính và kết quả xác thực. |
| Email, backup/restore — @vantien68 | Người nhận, xem trước, gửi giả lập; giao diện và file backup demo. | **Nhóm 1:** người nhận và gửi email thật, sao lưu/khôi phục server, xác thực và phân quyền. Backup Web demo không mặc định tương thích file Android. |
| Mống mắt và xác nhận thiết bị — trưởng nhóm theo dõi cùng @MP-1611 | Ghi nhận trạng thái chưa hỗ trợ và thiết kế thông báo phù hợp. | Cần mentor và các nhóm liên quan xác định SDK, thiết bị, license và phương án Web; không báo tính năng đã hoạt động. Xác nhận khóa thiết bị Android cần phương án Web/server được thống nhất. |

Các trạng thái gửi/nhận, xác thực, kiểm tra trùng, liveness và thao tác server đang **giả lập**, không chứng minh chức năng thật đã hoàn thành. CSV xử lý trên trình duyệt có thể demo độc lập; lưu hoặc đồng bộ dữ liệu thật vẫn chờ API.

### Quy tắc phối hợp và bàn giao

- **Mỗi thành viên chịu trách nhiệm trọn module:** giao diện, validation, trạng thái loading/rỗng/lỗi, dữ liệu giả lập, responsive và kiểm thử phần mình. Không dồn toàn bộ kiểm thử cho một người.
- **Trưởng nhóm sở hữu bộ nền chung:** `src/ui/`, theme/token, khung trang và điều hướng chung. Thành viên sử dụng lại; thay đổi bộ nền cần trao đổi và được trưởng nhóm review.
- **Chia file theo module trước khi làm song song:** nếu source hiện tại gom nhiều màn hình trong một file, trưởng nhóm tách hoặc thống nhất người sửa; không để hai thành viên cùng sửa độc lập một file dùng chung.
- **Camera chỉ có một người duy trì:** các module tài khoản, sinh viên và điểm danh nhận kết quả qua giao diện component đã thống nhất; không sao chép camera thành nhiều bản.
- **Điểm danh và báo cáo dùng chung mô hình dữ liệu:** thống nhất mã sinh viên, mã môn, mã buổi, ngày/giờ và trạng thái. Email lấy kết quả báo cáo dùng chung, không tự viết lại cách tính vắng/muộn.
- **Chưa có nhóm 1 và nhóm 4:** mỗi module tách xử lý giao diện khỏi service giả lập; trưởng nhóm tổng hợp nhu cầu API và phối hợp thống nhất cách tích hợp. Không tự coi endpoint, định dạng dữ liệu hoặc kết quả giả lập là hợp đồng chính thức.
- **Mỗi phần bàn giao qua nhánh riêng và PR:** kèm mô tả luồng, ảnh/video desktop/mobile, kết quả kiểm thử, phần đang mock và điểm còn phụ thuộc. Cải thiện FE ngoài Android phải ghi riêng để trưởng nhóm tổng hợp đề xuất backend.

## Điều kiện hoàn thành

- [ ] Có bảng đối chiếu đầy đủ Android → Web và trạng thái từng chức năng; các màn hình thuộc phạm vi tuần đã thực hiện có thể thao tác và hiển thị responsive.
- [ ] Camera và luồng liveness giả lập có thể trình diễn; không nhầm kết quả giả lập với xác thực thật.
- [ ] Luồng xử lý sau chụp có trạng thái gửi/kết quả giả lập và điểm tích hợp API.
- [ ] Có kết quả kiểm thử và hướng dẫn chạy cho những phần đã thực hiện.
- [ ] Các phụ thuộc, giới hạn và chức năng chưa tích hợp được ghi rõ.

## Phụ thuộc và lưu ý

- Nhóm 1: API document và thông tin tích hợp server.
- Nhóm 4: module liveness, cách sử dụng và định dạng đầu vào/đầu ra.
- Xác nhận với mentor trước khi coi luồng sinh viên tự đăng nhập hoặc tự điểm danh là nghiệp vụ chính thức.
- Chỉ xác nhận tích hợp liveness hoặc điểm danh qua server sau khi kết nối và kiểm thử thành phần thật.
