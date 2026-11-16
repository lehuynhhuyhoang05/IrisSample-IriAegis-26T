# Liveness nhóm 4 — Chuyển toàn bộ luồng kiểm tra sang Web

## 1. Bản đang dùng

Web hiện có các lớp **chớp mắt → quay hai phía → chính diện → đo phản xạ đỏ/xanh → MiniVision**. Ba lớp chủ động được chuyển từ code Android nhóm 4 sang JavaScript; MiniVision vẫn gọi server nhóm 4, không viết lại model hoặc đổi ngưỡng server.

Đây là triển khai luồng liveness trên trình duyệt, chưa phải chứng nhận độ chính xác tương đương Android trên mọi camera. Đối sánh danh tính và liên kết kết quả liveness với lượt điểm danh trên server nhóm 1 vẫn là phần riêng chưa có hợp đồng API; không gọi kết quả liveness là xác nhận đúng sinh viên.

Nguồn đã đọc và đối chiếu:

- [Android nhóm 4](https://github.com/Long965/IrisSample-IriAegis-26T/tree/be89383530aa5845cf793a7cd4db90478f20f445): `LivenessLogic.java`, `FaceCaptureActivity.java`, `AntiSpoofHelper.java`, `FaceMatchHelper.java`.
- [Server nhóm 4](https://github.com/Long965/IrisSample-IriAegis-26T/tree/38e09e8ed42178456876ef14fef3a14fc46a7b15/liveness_detection-main): `main.py`, notebook, model landmark và MiniFASNetV2.
- Tài liệu nhận kèm `Hỗ trợ tích hợp cho nhóm 2.md` mô tả Android; không phải API document của Web.

Lần triển khai trước chỉ gọi API một ảnh nên chưa đủ luồng Android. Bản thử thách hai bước tự viết trước đó đã bỏ; bản hiện tại có đối chiếu các phương thức và công thức gốc bên dưới. Bản trước được giữ ngoài repo trong `iris-aegis-backups/truoc-port-full-liveness-20261115`.

## 2. Luồng sử dụng

```text
Đồng ý đo ánh sáng → Bắt đầu xác thực → Camera trước, video inline
  → Nạp FaceLandmarker bằng model nhóm 4 cung cấp
  → Một mặt trong vùng preview, nhìn thẳng, hiệu chuẩn mắt mở
  → Mở mắt → nhắm cả hai mắt → mở lại
  → Quay hai phía, kiểm tra biến thiên mắt/mũi → nhìn thẳng 3 frame
  → Thử khóa phơi sáng/cân bằng trắng nếu camera hỗ trợ
  → Baseline → đỏ → xanh → đo RGB vùng lõi da mặt → phục hồi ánh sáng
  → Phản xạ đạt: tự chụp cùng frame và gửi crop đến MiniVision nhóm 4
      REAL: cho người dùng chọn Sử dụng ảnh này
      FAKE hoặc lỗi: không cho sử dụng, bắt đầu lại toàn phiên
```

Không có nút bỏ qua bước chủ động trong màn nghiệp vụ. Không gọi MiniVision nếu chưa qua chớp mắt/quay đầu/flash. Không tự cấp REAL khi model lỗi hoặc không nạp được. Chỉ đổi màu màn hình không được tính là hoàn thành flash.

- `/#/camera`: luồng đầy đủ để thử độc lập, không cần đăng nhập server nhóm 1.
- `/#/camera/passive`: công cụ **thử riêng API một ảnh**, có nhãn riêng, không trả ảnh về màn điểm danh. Không dùng đường này làm xác thực đầy đủ.
- Camera điểm danh, chụp ảnh hồ sơ và FaceFlow demo đều dùng luồng đầy đủ khi truyền `livenessRequired`.
- Chọn ảnh từ file là cập nhật ảnh hồ sơ, không có bằng chứng liveness. Luồng đăng nhập/điểm danh demo không camera vẫn ghi rõ là giả lập và không tạo kết quả nhóm 4 thật.

## 3. Đối chiếu source Android → Web

| Android nhóm 4 | File Web | Nội dung chuyển |
|---|---|---|
| `LivenessLogic.checkBlink()` | `src/liveness/liveness-state-machine.js` | Ba frame mắt mở, hai mắt nhắm/mở, giới hạn đầu thẳng, kiểm tra thay đổi tư thế lúc chớp |
| `check3DPerspective()`, `checkHeadShake()` | `liveness-state-machine.js` | Quay hai phía ±11,5°, biến thiên tỷ lệ mắt ≥0,015 hoặc mũi ≥0,05; chính diện ±10°, giữ ba frame |
| Kiểm tra frame đứng/cắt ghép | `liveness-state-machine.js` | Ngưỡng Euler, mũi và mắt; 28 frame tĩnh hoặc 18 frame tĩnh rồi chuyển động; giới hạn nhảy yaw/pitch/roll |
| `startSingleColorFlashChallenge()` | `src/liveness/flash-challenge.js`, `FullLivenessCamera.jsx` | Baseline ít nhất 150 ms, đỏ/xanh ít nhất 500 ms mỗi màu; bỏ 150 ms đầu sau cập nhật màu, đủ ba frame mới mỗi pha, phục hồi 220 ms |
| `calculateFaceCoreRGB()` | `flash-challenge.js` | Vùng mặt co vào 22% mỗi cạnh, lấy mẫu RGB cách bốn pixel, không dùng toàn nền ảnh |
| `evaluateRedBlueRatioCycle()` | `flash-challenge.js` | Cùng công thức R/B, chromaticity, đối xứng baseline và ngưỡng chống cháy sáng |
| `Camera.Parameters`/ML Kit | `src/liveness/landmark-input.js`, `FullLivenessCamera.jsx` | Thay bằng MediaPipe landmark và MediaStreamTrack; là phần chuyển nền tảng, không phải Java chạy trong browser |
| `AntiSpoofHelper` | `src/liveness/client.js` → `main.py` nhóm 4 | Dùng MiniFASNetV2 `.pth` server thay runtime TFLite Android; giữ nguyên verdict/threshold từ server |
| MobileFaceNet đối sánh 192 chiều | Chưa có API/runtime đối sánh Web trong phạm vi bàn giao | Không tự giả lập xác minh danh tính sau khi liveness đạt |

Ngưỡng quay đầu code Android là 11,5°; tài liệu nhận kèm ghi 15°. Port theo **code**, không sửa source nhóm khác. Cấu hình xử lý Web tối đa khoảng 30 frame/giây để gần giả định frame của Android; FPS thấp vẫn ảnh hưởng thời gian và khả năng bắt chớp mắt, cần test thiết bị thật.

### Đầu vào mắt và tư thế trên trình duyệt

ML Kit không cung cấp SDK Java chạy trong trình duyệt. Web dùng [Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker?tab=Web) và chính file `.task` trong source server nhóm 4. File đặt tại `public/models/face-landmarker/face_landmarker.task`; checksum/nguồn nằm trong README cùng thư mục.

- Dùng ma trận tư thế để ước lượng yaw/pitch/roll; thứ tự/hướng trục khác nền tảng phải đánh giá lại trên thiết bị. Hướng dẫn yêu cầu quay hai phía nên không phụ thuộc việc preview lật gương đổi nghĩa trái/phải.
- `eyeBlink` là hệ số biểu cảm, **không phải** xác suất mắt mở ML Kit. Bản trước đòi cả hai score ≥0,85 và quét thưa nên người dùng có thể kẹt ở bước 1/2.
- Adapter hiện đo độ mở mí mắt (EAR) trong tọa độ pixel, lấy mốc mắt mở ổn định ít nhất năm frame/500 ms. Độ mở được chuẩn hóa theo mốc từng phiên; mắt nhắm cần cả thay đổi hình học và tăng score blink. State machine nhận đầu vào [0,1] để áp dụng ngưỡng 0,75/0,15 của port; đây không phải xác suất ML Kit đã hiệu chuẩn.
- Không dùng ngưỡng 0,85 cố định để quyết định chớp mắt. Không chỉ hạ confidence detector để cho qua.
- Chỉ phân tích frame mới qua `requestVideoFrameCallback`, fallback `requestAnimationFrame`. Watchdog độc lập vẫn hết hạn khi video không tiến frame.
- Một phiên chủ động tối đa 25 giây; frame không tiến 1,8 giây báo gián đoạn. Nhiều mặt/mất mặt lâu trước flash xóa tiến độ. Sau flash phải phát hiện lại đúng một mặt chính diện mới được chụp.

### Công thức flash chuyển nguyên từ nhóm 4

Với màu đỏ và xanh đã đo trên da mặt:

```text
shift = R_red / (B_red + 1) - R_blue / (B_blue + 1)
normRed = R_red / sum(red) - R_blue / sum(blue)
normBlue = B_blue / sum(blue) - B_red / sum(red)

Đạt khi shift ≥ 0,280; normRed ≥ 0,040; normBlue ≥ 0,040
và R/B đỏ > baseline + 0,035; R/B xanh < baseline - 0,035.
```

Thiếu mẫu hoặc cả hai pha quá chói (luma >215) không đạt. Bản Web bắt buộc có baseline; không cho qua vì mẫu rỗng. Frame trong thời gian ổn định màu hoặc timestamp trùng không tính vào mẫu. Sau flash tắt lớp phủ, phục hồi cấu hình camera và chờ 220 ms trước khi lấy ảnh.

Sau phản hồi iPhone, bộ điều phối Web tính thời gian pha từ khi React commit màu và đi qua hai `requestAnimationFrame`, không chỉ từ lúc yêu cầu đổi màu. Đây là cách chờ lịch vẽ của trình duyệt, **không đo được chính xác lúc màn hình vật lý phát màu**. Dùng `mediaTime` của callback video nếu có; frame có timestamp trước khoảng ổn định màu không được tính. Mỗi pha cần ít nhất ba frame mới; nếu camera chậm thì pha kéo dài tối đa 1.200 ms thay vì chuyển màu khi chưa đủ mẫu. Thiếu frame hoặc không nhận được xác nhận cập nhật màu sẽ thất bại; không tăng số lần chớp sáng hay hạ các ngưỡng nhóm 4.

Thông tin kiểm tra hiện giữ kết quả flash cả khi không đạt: shift, normR, normB, đối xứng baseline và số mẫu nền/đỏ/xanh. Khi thất bại do phản xạ, phần này tự mở để người kiểm thử gửi đúng số đo, thay vì chỉ thấy trạng thái mắt của frame trước.

Giống `onPreviewFrame()` của Android, trong pha flash giữ vùng mặt chính diện cuối cùng để lấy RGB và tạm ngừng suy luận landmark trên frame bị nhuộm màu. Điều này tránh tốn CPU hoặc mất landmark chỉ vì ánh sáng đỏ/xanh. Sau thời gian phục hồi phải suy luận lại trên ảnh mới, không dùng tọa độ cũ để xác nhận ảnh cuối. Trong pha màu không có theo dõi tư thế/nhận dạng liên tục; đây cũng là giới hạn của cách lấy mẫu bằng ROI và không được mô tả là đo chiều sâu hoặc xác minh danh tính.

Web thử khóa `exposureMode` và `whiteBalanceMode` khi track hỗ trợ `manual`, kiểm tra lại settings thay vì cho rằng `applyConstraints` luôn có hiệu lực. Sau kết thúc/hủy phải phục hồi chế độ cũ. [Khả năng từng track tùy trình duyệt và thiết bị](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getCapabilities).

Android gốc cũng chỉ khóa AE/AWB khi phần cứng báo hỗ trợ. Web làm tương tự: nếu thiếu khả năng khóa, vẫn phải **đo phản xạ đạt**, ghi trạng thái không khóa trong kết quả và hiển thị giới hạn. Không khẳng định cùng độ tin cậy phần cứng Android trên Safari/iPhone. Có thể thất bại do ánh sáng môi trường mạnh, camera tự bù sáng, màn hình quá tối hoặc thiếu mẫu; không tự nới ngưỡng để demo đạt.

Hai pha đỏ/xanh là kích thích đo, không phải hiệu ứng trang trí. Người dùng đồng ý trước khi bắt đầu; có nút Dừng kiểm tra ánh sáng trên lớp phủ và có thể hủy bằng Escape. Rời tab, pause, track mute/ended, đóng màn hình hoặc bắt đầu lại hủy phiên, tắt flash và không nhận kết quả cũ.

## 4. API MiniVision giữ nguyên

| Phương thức | Endpoint nhóm 4 | Dữ liệu |
|---|---|---|
| GET | `/` | Health/model đã nạp |
| POST | `/api/v1/predict-liveness` | Multipart với trường `file` |

Response gồm `status`, `result`, `is_real`, `real_score`, `spoof_score`, `threshold_used`, `message`. Web không gửi JWT nhóm 1 hoặc tự đổi threshold; giữ mặc định server 0,108. Không tự tính lại REAL từ điểm server đã làm tròn.

API xử lý một ảnh, resize BGR về 80×80 rồi suy luận MiniFASNetV2; không tự detect mặt, không chạy active challenge. Web gửi crop 2,7 quanh mặt theo notebook nhóm 4, theo hướng ảnh gốc. Preview lật gương không làm đổi hướng dữ liệu gửi model.

`main.py` nhóm 4 không bị sửa. Chớp mắt/quay đầu/flash chạy trong phần chuyển nền tảng Web, MiniVision chạy trên server. Đây là đường triển khai được chọn để có đủ luồng với source hiện có.

### Component dùng chung

```jsx
<CameraApp embedded livenessRequired onCapture={(image, result) => {
  // Chỉ gọi sau khi active + flash đạt, API nhóm 4 trả REAL,
  // và người dùng bấm Sử dụng ảnh này.
  // result.web_liveness chứa kết quả chủ động/flash, trạng thái khóa camera.
  // Không dùng dữ liệu frontend như bằng chứng bảo mật do server xác minh.
}} />
```

`App.jsx` chọn `FullLivenessCamera` cho các luồng cần liveness; camera thông thường vẫn có đường riêng. Tùy chọn `passiveOnly` chỉ dùng tại trang thử API, không truyền vào màn nghiệp vụ. Kết quả `web_liveness.serverBound` luôn false: nhóm 1 chưa có hợp đồng kiểm chứng bằng chứng này.

## 5. Chạy và test bằng tay

Backend nhóm 4 đã được lấy riêng ở workspace. Terminal thứ nhất:

```powershell
cd D:\Study\Project_HKDN\iris-aegis-group4-server\liveness_detection-main
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Terminal thứ hai:

```powershell
cd D:\Study\Project_HKDN\iris-aegis-web
npm.cmd run dev
```

Mặc định `.env.example`:

```dotenv
VITE_LIVENESS_BASE_URL=/liveness-api
LIVENESS_PROXY_TARGET=http://127.0.0.1:8000
```

Vite proxy bỏ `/liveness-api` trước khi chuyển sang nhóm 4, tách khỏi `/api/v1` nhóm 1 cổng 5000. Khi deploy cần reverse proxy tương ứng; Vite không tự cấu hình hosting.

1. Mở `http://127.0.0.1:5173/#/camera`, tải lại trang để nhận code mới.
2. Cho phép đo hai lượt sáng và gửi ảnh, bấm **Bắt đầu xác thực**.
3. Nhìn thẳng, giữ mắt mở khoảng một giây để hiệu chuẩn. Khi được nhắc, chớp cả hai mắt và mở lại.
4. Quay chậm sang một phía, rồi phía còn lại, nhìn thẳng trở lại.
5. Giữ nguyên mặt qua hai pha đỏ/xanh. Web đo phản xạ, tự lấy ảnh và gọi MiniVision sau khi đạt.
6. Mở **Thông tin kiểm tra** nếu bị kẹt: xem eyeBlink, độ mở mắt đã quy đổi, góc đầu, số mặt, điểm flash và MiniVision nếu có. Không chụp màn hình/ghi hình người khác khi chưa được đồng ý.

Thử iPhone bằng terminal thứ ba:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:5173
```

Mở link HTTPS được cấp trong **Safari trực tiếp**, thêm `/#/camera`. Giữ Web và backend 8000 chạy trên máy tính. Đừng mở qua trình duyệt Zalo.

Máy mới: clone nhánh server, tạo venv Python 3.10 và cài `scripts/requirements-liveness-api.txt` của Web. File này ghi bộ phiên bản API tối thiểu đã chạy, không ghi đè requirements/notebook upstream. File `.task` được giữ trong source Web nên không cần tự đi tải model khác.

## 6. Kiểm thử và giới hạn thực tế

Kết quả ngày 15/11/2026:

| Kiểm tra | Kết quả và phạm vi |
|---|---|
| ESLint | Đạt |
| Unit test | 53 bài đạt, gồm kiểm tra hai bộ số đo iPhone chưa đạt đúng điều kiện gốc |
| Build production | Đạt |
| Chrome desktop/mobile | Bộ liveness trước đó 24/24 bài đạt; sau sửa watchdog chạy lại 14 ca toàn luồng, callback không về/timestamp đứng, suy luận chậm, CPU fallback, warmup và video đứng thật, đều đạt |
| WebKit mô phỏng iPhone 13 | Bộ liveness sau sửa watchdog/nguồn frame đạt 17/17 bài |
| Web → FastAPI/MiniVision thật | HTTP 200, nhận và hiển thị nhãn/điểm từ model; phần thao tác chủ động được cấp pixel/landmark tổng hợp trong lần thử kết nối này |
| Camera và Safari iPhone vật lý | Chưa xác nhận toàn bộ luồng mới; cần người dùng thử trực tiếp |

- Unit test kiểm tra thứ tự state machine, chớp một mắt, thiếu phối cảnh, frame đứng/cắt ghép, timeout, flash thiếu mẫu/không phản xạ/chói, khóa và phục hồi camera, adapter mắt theo phiên.
- Playwright dùng camera pixel/landmark tổng hợp để kiểm tra toàn luồng trên Chrome và WebKit: đi qua đỏ/xanh thật trong DOM, đo RGB từ canvas, gửi multipart, nhận REAL/FAKE/lỗi; hủy hoặc request cũ không mở nút sử dụng ảnh.
- Model `.task` thật từ nhóm 4 đã nạp trên Chrome/WebKit; ảnh portrait mẫu cho một mặt, EAR khoảng 0,20–0,21 và adapter hiệu chuẩn mắt mở thành công. Điều này không thay kiểm thử người thật chớp mắt hoặc flash vật lý.
- Chưa xác nhận FAR/FRR hoặc khả năng chống replay/mặt nạ của bản chuyển Web; chưa kiểm thử trọn luồng trên iPhone vật lý. Việc test tự động đạt không chứng minh chất lượng biometric sản xuất.
- API passive từng trả REAL cho ảnh portrait mẫu ở ngưỡng mặc định. Nhóm 4 cũng ghi giới hạn dataset ảnh in NUAA trong README. Giữ riêng kết quả test kết nối và test chống giả, không sửa nhãn frontend để che kết quả model.
- Liveness đạt không xác định danh tính. MobileFaceNet đối sánh và server xác nhận phiên/bằng chứng cần tích hợp riêng; Web không tự thêm endpoint hoặc trường ngoài OpenAPI nhóm 1.
- Code FE có thể bị người dùng sửa; kết quả chủ động đo trong browser không phải chứng thư server tin cậy. Để triển khai điểm danh bảo mật đầu cuối, nhóm 1/4 cần hợp đồng challenge/evidence gắn đúng phiên, sinh viên và môn, hoặc xác minh chuỗi frame phía server.

Chạy `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:ui` và `npm.cmd run test:webkit`. Ghi riêng thiết bị thật, ánh sáng, kết quả người thật/ảnh in/video và trạng thái khóa camera khi nhóm thử manual.

### Bản sửa báo nhầm “Chuyển động nhảy khung”

Sau khi người dùng báo lỗi trên laptop và iPhone, kiểm tra thấy hai vấn đề trong cách chuyển dữ liệu Web sang state machine:

1. Phép trừ góc trực tiếp coi `179° → -179°` là thay đổi `358°`. Bản sửa dùng khoảng cách góc ngắn nhất, nên trường hợp này là `2°`; thay đổi thực sự vượt ngưỡng giữa hai frame liên tục vẫn bị chặn.
2. Khi mặt tạm ra khỏi vùng nhìn, adapter mắt trước đây xóa baseline ngay; logic chuyển động có thể giữ tư thế cũ. Sau phản hồi iPhone, mất landmark ngắn dưới 500 ms chỉ tạm ngừng nhận tiến độ, giữ baseline và bước đang làm, rồi lấy lại mốc chuyển động khi mặt trở lại. Mất theo dõi từ 500 ms, nhiều mặt hoặc gián đoạn bất thường mới xóa toàn bộ tiến độ và hiệu chuẩn lại. Việc giữ bước trong khoảng ngắn không chứng minh liên tục cùng danh tính; lớp đối sánh/server vẫn cần tích hợp riêng.
3. Mốc frame 250 ms cố định của bản sửa ban đầu không còn áp dụng cho mọi thiết bị. Hiện dùng trung vị 12 khoảng frame gần đây: giới hạn khởi động lại là `min(1000, max(250, 3 × trung vị))` ms. Máy xử lý đều ở 280–300 ms/frame không tự reset mỗi frame; khoảng ngắt bất thường vẫn reset, không được tính là đã hoàn thành. Watchdog 1.800 ms và thời hạn phiên 25 giây vẫn giữ nguyên.

Hiệu chuẩn ban đầu chờ cả tư thế và trạng thái mắt ổn định; biến động góc quá 8° trong cửa sổ đo sẽ bắt đầu lại cửa sổ 500 ms. Đây là điều chỉnh adapter Web, không phải thay đổi model hay ngưỡng MiniVision của nhóm 4.

Thông tin kiểm tra hiện hiển thị **đúng sample gây lỗi**, gồm ba góc quay/ngẩng/nghiêng, độ chênh giữa frame và khoảng thời gian xử lý. Trước đây UI cập nhật mỗi 200 ms nên có thể vẫn hiện sample đang hiệu chuẩn (`Mắt mở: — / —`) dù lỗi phát sinh ở frame sau.

Đã bổ sung test hồi quy cho góc qua ±180°, hiệu chuẩn lại sau mất mặt, gián đoạn frame và tư thế khởi tạo chưa ổn định; test trình duyệt vẫn kiểm tra nhảy góc thật bị chặn. Một lần thử webcam laptop sau sửa đã lên bước chớp mắt và không báo lỗi trong thời gian quan sát 12 giây; chưa xác nhận hoàn tất chuỗi quay đầu/flash trên camera thật. Vì chưa có trace lỗi từ thiết bị người dùng, các lỗi tìm được không đủ để khẳng định đã giải thích mọi lần lỗi manual. Nếu còn xảy ra, dùng số đo mới để xác định trục và frame cụ thể; không tự tăng ngưỡng để bỏ kiểm tra.

### Cập nhật thử PC và iPhone

Người dùng đã báo một lần PC hoàn thành đầy đủ: MiniVision REAL 0,9999; flash shift 0,550. Đây là kết quả manual người dùng cung cấp, không phải phép đo FAR/FRR. iPhone đã qua chớp mắt nhưng có lần quay đầu bị reset, có lần không đạt flash; chưa có số đo của lần flash thất bại nên chưa kết luận nguyên nhân vật lý cụ thể.

Web ưu tiên delegate GPU và fallback CPU nếu khởi tạo hoặc suy luận khởi động GPU thất bại. Một frame warmup không được tính vào thử thách; đồng hồ và watchdog bắt đầu sau đó. Thử model thật với ảnh portrait mẫu trên Chrome và WebKit đều nạp GPU và phát hiện một mặt; lần suy luận đầu khoảng hai giây trên Windows nên cần warmup để không báo nhầm video gián đoạn. Kết quả này không chứng nhận hiệu năng hoặc flash trên iPhone thật. Tham khảo [cấu hình delegate MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/setup_web) và [metadata callback video](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback).

Khi test lại iPhone: mở Safari trực tiếp, giữ trang ở phía trước, giữ máy tương đối cố định, chỉ quay mặt vừa đủ sang hai phía. Nếu flash không đạt, ghi phần **Flash** mới và thông báo lỗi; đừng suy từ việc người thật bị từ chối thành kết luận người dùng giả. Trình duyệt không hỗ trợ khóa AE/AWB có thể làm phép đo không đạt trong một số điều kiện; FE không thể cam kết khắc phục bằng code điều khiển camera khi API thiết bị không cung cấp.

### Bản sửa “Video bị gián đoạn” trên điện thoại

Người dùng báo PC tiếp tục hoàn thành (REAL 0,9993, shift 0,682, normR 0,083, normB 0,069, mẫu 3/4/4), còn iPhone báo đúng **“Video bị gián đoạn”**. Dòng này do watchdog không nhận frame xử lý trong 1.800 ms; khác với lỗi quyền camera, track ended/mute, rời tab hoặc lỗi API. Chưa có trace từ iPhone để khẳng định callback bị đứng là nguyên nhân thực tế duy nhất.

Hai điều chỉnh đã thực hiện:

- Khi có `requestVideoFrameCallback`, vẫn kiểm tra thời gian video qua watchdog. Nếu hơn 600 ms không xử lý được frame nhưng `video.currentTime` đang tiến, video sẵn sàng và trang đang hiển thị, chuyển một lần sang đọc frame bằng timer 50 ms. Callback cũ được hủy/không còn xử lý; không mở camera lần thứ hai. Mỗi lần đọc vẫn yêu cầu timestamp mới. Chuyển nguồn sẽ xóa tiến độ, baseline mắt, ROI flash và các mẫu màu, giữ thời hạn phiên ban đầu để không trộn hai đồng hồ video.
- Ghi nhận thời điểm hoàn tất suy luận thay vì dùng thời điểm trước lời gọi đồng bộ. Một kết quả có timestamp mới vừa xử lý xong không bị kết luận mất camera chỉ vì suy luận lâu; deadline toàn phiên 25 giây vẫn áp dụng. Nếu timestamp không tiến hoặc không nhận được kết quả mới, watchdog độc lập vẫn dừng sau 1.800 ms. Không tạo frame giả để giữ phiên sống.

Khi watchdog thất bại, mục Thông tin kiểm tra tự mở, giữ `Nguồn frame`, thời gian suy luận và `Camera: readyState / paused / track / muted / videoTime / lastFrame / age`. Đây là thông tin kỹ thuật để xác định video không phát, callback không về, timestamp đứng hay xử lý chậm; không ghi ảnh/video vào log.

Test WebKit đã kiểm tra callback không trả về, metadata timestamp luôn bằng 0 nhưng video tiến, suy luận sống bị chậm 2.100 ms và video thực sự đứng. Hai trường hợp đầu vẫn phải hoàn tất chớp mắt/quay đầu/flash/MiniVision; trường hợp đứng thực sự không gọi API, đóng track và hiển thị thông tin chẩn đoán. Những bài này dùng video/landmark giả lập, không xác nhận sửa dứt điểm trên thiết bị iPhone vật lý. Nếu điện thoại vẫn lỗi, cần dòng Camera mới để xác định tiếp thay vì tự tăng timeout hoặc nới ngưỡng liveness.

### Người thật trên iPhone chưa đạt phản xạ xanh

Sau sửa watchdog, người dùng gửi hai lần không đạt: `shift/normR/normB = 0,347/0,057/0,038` và `0,278/0,046/0,032`, baseline đều đạt, mỗi pha có 3–5 mẫu. Đây là phép AND bị từ chối đúng công thức nhóm 4, không phải kết quả FAKE từ API. Người dùng đã để độ sáng gần tối đa và tắt True Tone; chưa có cơ sở kết luận chỉ do thiết lập màn hình.

Đã thêm `failedChecks` vào kết quả và thu RGB trung bình từng frame được nhận, kèm thời gian sau xác nhận cập nhật màu. Nút **Tải số đo ánh sáng (.json)** xuất báo cáo cục bộ không có ảnh, token hoặc tài khoản, không gửi tự động. Giữ nguyên ngưỡng và phương pháp trung bình; không lấy riêng các frame có điểm cao hoặc làm tròn để cho đạt. Kiểm thử hồi quy gồm số đo fail của người dùng, số đo PC pass và xuất JSON trên WebKit/Chrome.

Xem [báo cáo riêng cho nhóm 4](BAO-CAO-LIVENESS-IOS.md). Việc bổ sung thông tin đo chưa giải quyết được sai từ chối trên camera iPhone thật; cần dữ liệu thiết bị và hiệu chuẩn/kiểm chứng của nhóm 4 trước khi thay đổi gate hoặc thuật toán.
