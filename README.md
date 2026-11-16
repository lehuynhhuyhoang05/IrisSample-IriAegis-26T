# IriAegis Web — Giao diện và prototype nghiệp vụ

**Liveness nhóm 4:** [LIVENESS.md](LIVENESS.md). Đã chuyển luồng Android sang Web: chớp mắt → quay hai phía → đo flash đỏ/xanh → API MiniVision. Thử tại `/#/camera` hoặc bước điểm danh. Backend nhóm 4 chạy cổng 8000, proxy `/liveness-api`. Cần thử camera/iPhone thật để xác nhận chất lượng; chưa có đối sánh danh tính hoặc bằng chứng do server nhóm 1 xác minh.

**Tình huống iPhone người thật không đạt flash:** [báo cáo và hướng thu số đo](BAO-CAO-LIVENESS-IOS.md). Hiện chưa xác nhận khắc phục trên thiết bị thật. Sau bước ánh sáng có thể tải JSON số đo trong Thông tin kiểm tra; công thức/ngưỡng nhóm 4 không bị nới để cho qua.

**Đối chiếu API mới nhất:** [DOI-CHIEU-API-SERVER.md](DOI-CHIEU-API-SERVER.md) — ma trận 38 operation Web, các phần thiếu đã bổ sung, giới hạn và mâu thuẫn trong YAML. Chạy `npm.cmd run audit:api` để xem ma trận.

Tham khảo [đối chiếu chức năng Android → Web](DOI-CHIEU-ANDROID-WEB.md) và quy chuẩn giao diện [DESIGN.md](DESIGN.md). Bảng đối chiếu được lập khi còn bản demo; cần xác nhận lại trạng thái từng chức năng với API hiện có.

## Bản nâng cấp kết nối API nhóm 1

Trang `/` hoặc `/#/app` mặc định mở đăng nhập server. Dùng tài khoản nhóm 1 cấp. Hướng dẫn cấu hình, kết quả rà soát UX, endpoint đã nối và các lệch giữa YAML/source: [DANH-GIA-UX-VA-TICH-HOP-SERVER.md](DANH-GIA-UX-VA-TICH-HOP-SERVER.md).

Trình duyệt gọi `/api/v1` qua proxy Vite; đích mặc định `http://localhost:5000` lấy từ YAML. Có thể tạo `.env.local` từ `.env.example`, đổi `API_PROXY_TARGET` rồi khởi động lại Vite. Trên điện thoại/tunnel nên giữ API cùng origin. Đặc tả nhóm 1 có endpoint planned, chưa có đối sánh mặt hoặc liên kết bằng chứng liveness vào check-in; liveness chạy qua API riêng nhóm 4. Web không tự chuyển thành kết quả giả lập khi server lỗi. Chưa xác nhận hoạt động với backend nhóm 1 thật đang chạy.

## Dữ liệu nghiệp vụ

Ứng dụng có chế độ kết nối server và chế độ dữ liệu mẫu để kiểm thử giao diện. Tại màn đăng nhập chọn **Mở dữ liệu mẫu**, sau đó đăng nhập `super@demo.test` hoặc `lan@demo.test` với mật khẩu `Demo@123`. Mật khẩu điểm danh mẫu là `123456`. Dữ liệu mẫu lưu trên trình duyệt, tách biệt với server.

## Bộ nền giao diện cho nhóm — tuần 2

Chạy `npm.cmd run dev`, sau đó mở `/#/ui-kit` trên địa chỉ Vite để xem màn hình mẫu, component, token và hướng dẫn. Bộ mẫu chỉ có trong chế độ phát triển, không nằm trong build production. Hướng dẫn cho thành viên: [UI-GUIDELINES.md](UI-GUIDELINES.md). Đường dẫn `/#/camera` mở camera độc lập.

Bộ mẫu dùng dữ liệu giả trong bộ nhớ; không phải bản ứng dụng nghiệp vụ hoàn chỉnh. Các component chung nằm tại `src/ui`, được tách khỏi CSS camera. Test UI: `npm.cmd run test:ui` (cần Chrome cài trên máy).

## Prototype camera

`/#/camera` mở luồng liveness đầy đủ được chuyển từ nhóm 4; `/#/camera/passive` thử riêng API phân loại một ảnh. Phát hiện mặt và kết quả liveness không phải xác minh danh tính.

Camera đã dùng `navigator.mediaDevices.getUserMedia()` để lấy `MediaStream`, theo phần truy cập thiết bị của bộ công nghệ WebRTC. Luồng được gắn vào `<video playsInline>` và chụp qua `canvas`; MediaPipe là thành phần riêng để phát hiện khuôn mặt. Xem [hướng dẫn WebRTC về media devices](https://webrtc.org/getting-started/media-devices).

## Chạy trên máy tính

Cả nhóm sử dụng Node.js 22, sau đó mở PowerShell trong thư mục này:

```powershell
npm.cmd install
npm.cmd run dev
```

Chạy `npm.cmd test` để kiểm tra logic vùng cắt ảnh, hợp đồng API và luồng liveness.

Mở địa chỉ localhost được in trong terminal. Tại `/#/camera`, đọc và chọn đồng ý đo ánh sáng/gửi ảnh, bấm **Bắt đầu xác thực**, rồi cho phép trình duyệt sử dụng webcam. Giữ mắt mở để hiệu chuẩn, chớp mắt, quay chậm hai phía và nhìn thẳng để đo đỏ/xanh. `npm.cmd run build` tạo bản build. Dùng `npm.cmd` trong PowerShell để tránh lỗi chặn `npm.ps1` theo execution policy. Lần đầu mở camera cần mạng để tải WASM MediaPipe; model landmark nằm trong `public/models/face-landmarker`. Với luồng liveness phải phát hiện đúng một mặt và dịch vụ nhóm 4 phải hoạt động; lỗi hoặc FAKE không cho sử dụng ảnh. Hướng dẫn khởi chạy backend và kiểm thử nằm trong [tài liệu tích hợp](LIVENESS.md).

## Kiểm thử trên điện thoại

### Safari iPhone và WebKit tự động

Để thử **Safari iPhone thật**, chạy bản build tại cổng 4180 và mở Cloudflare Tunnel theo hai terminal bên dưới. Trên iPhone mở link HTTPS bằng Safari trực tiếp; kiểm tra camera độc lập hoặc đăng nhập server để kiểm tra màn nghiệp vụ. Không cần chạy WebKit trên Windows để thực hiện việc này.

Để chạy **WebKit tự động** trên máy hỗ trợ:

```powershell
npx.cmd playwright install webkit
npm.cmd run test:webkit
```

Cấu hình riêng `playwright.webkit.config.js` dùng thiết bị mô phỏng iPhone 13; các test Chrome mặc định vẫn ở `npm.cmd run test:ui`. Test WebKit không xác nhận thay cho thiết bị iPhone thật.

Máy hiện tại đã chạy được WebKit với cấu hình iPhone 13. Lần kiểm tra liveness ngày 15/11/2026 sau sửa watchdog/nguồn frame đạt 17/17 bài trên WebKit; kết quả và phạm vi mô phỏng được ghi trong [tài liệu tích hợp](LIVENESS.md). Trước đó Smart App Control/Code Integrity chặn `WebKit2.dll` (sự kiện 3077 và 3118); sau khi người dùng thay đổi thiết lập Windows, lỗi khởi động không còn. Có sửa quản lý focus của Button/Dialog để đóng hộp thoại trả focus đúng trên WebKit.

Muốn nhìn cửa sổ WebKit trong lúc test:

```powershell
npm.cmd run test:webkit -- --headed --workers=1
```

Muốn mở giao diện Playwright để chọn và chạy từng bài test:

```powershell
npm.cmd run test:webkit -- --ui
```

Không chạy đồng thời hai bộ test vì cùng dùng cổng 5187. Test camera hiện xác nhận giao diện và luồng giả lập; camera phần cứng, quyền thực tế và bàn phím Safari vẫn cần kiểm thử trên iPhone thật.

Camera cần secure context: HTTPS hoặc localhost. `localhost` trên máy tính không phải localhost của điện thoại; HTTP qua IP mạng LAN thường không mở được camera. Dùng một môi trường HTTPS đáng tin cậy để thử trên điện thoại, trong đó có Safari iOS thật. Video dùng `playsInline`, `autoPlay` và `muted`; ảnh được lật như preview và chỉ lưu trong bộ nhớ trang.

### Tự tạo link HTTPS bằng Cloudflare Tunnel trên Windows

Cloudflare Tunnel đã được cài trên máy hiện tại tại `C:\Program Files (x86)\cloudflared\cloudflared.exe`. Với máy khác, cài `cloudflared` theo [hướng dẫn chính thức](https://developers.cloudflare.com/tunnel/downloads/).

**Terminal 1 — build và chạy bản Web:** mở PowerShell trong thư mục `iris-aegis-web`, rồi chạy:

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4180 --strictPort
```

Giữ terminal này mở. Nếu cổng `4180` đã được dùng, chọn cổng khác và dùng đúng cổng đó ở lệnh tiếp theo. Mỗi lần sửa code cần chạy lại `npm.cmd run build` để cập nhật bản thử. Dùng Vite preview để có proxy `/api/v1`; `http-server dist` chỉ phục vụ file tĩnh, không chuyển request API tới Flask. Backend phải chạy để sử dụng chức năng nghiệp vụ.

**Terminal 2 — mở tunnel:** mở một cửa sổ PowerShell khác và chạy:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:4180
```

Giữ terminal mở; sao chép đường dẫn `https://...trycloudflare.com` mà lệnh in ra và mở bằng **Safari trực tiếp** trên iPhone. Không cần mở link qua trình duyệt tích hợp Zalo: lần thử trước camera bị toàn màn hình và đơ trong Zalo. Camera cần có mạng để tải model phát hiện khuôn mặt.

Đây là link công khai tạm thời: bất kỳ ai có link có thể truy cập bản Web. Chỉ chia sẻ link cho người kiểm thử. Để ngừng, nhấn `Ctrl+C` tại terminal tunnel; nhấn `Ctrl+C` ở terminal 1 để ngừng server. Mỗi lần tạo tunnel sẽ có thể nhận link khác. Hướng dẫn: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Phong cách

Các màu mint, nền và màu chữ lấy từ `app/src/main/res/values/colors.xml` của ứng dụng Android; bố cục Web được thiết kế lại cho màn hình lớn và điện thoại.

Danh sách token đã trích xuất và lưu ý chuyển đổi Android → Web: [DESIGN-TOKENS.md](DESIGN-TOKENS.md).
