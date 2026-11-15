# Giải thích source prototype camera và câu hỏi thường gặp

Tài liệu này dành cho phiên bản **chỉ có camera**, không mô tả bản mockup nhiều luồng. Đọc cùng [CODE-FLOW-WEEK-1.md](CODE-FLOW-WEEK-1.md), trong đó có các đoạn code dài hơn. Source thực tế là căn cứ khi hai tài liệu khác nhau.

## 1. Bài toán và phạm vi

Prototype cho phép mở camera trước, hiển thị video trong trang, phát hiện có khuôn mặt, chụp ảnh, xem và chụp lại. Video và kết quả AI được xử lý trong trình duyệt. Chưa có đăng nhập, cơ sở dữ liệu, API điểm danh, đối sánh danh tính hay kiểm tra người thật. Ảnh chỉ lưu trong state của trang.

```text
index.html → main.jsx → App.jsx
                           ├─ getUserMedia → MediaStream → video
                           ├─ MediaPipe → trạng thái phát hiện mặt
                           └─ canvas + camera-crop.js → ảnh xem trước
```

## 2. Các file trong `src`

| File | Trách nhiệm |
|---|---|
| `main.jsx` | Tạo React root, import CSS và render `App`. |
| `App.jsx` | Giao diện, state, vòng đời camera, MediaPipe và chụp ảnh. |
| `camera-crop.js` | Tính vùng ảnh giữa frame tương ứng với khung xem `object-fit: cover`. |
| `camera-crop.test.js` | Bốn test cho phép tính vùng cắt và đầu vào không hợp lệ. |
| `android-tokens.css` | Các biến CSS tham khảo tài nguyên Android gốc. |
| `styles.css` | CSS nền: typography, header, nút, camera, trạng thái và import Tailwind. Có một số selector cũ không còn được JSX sử dụng. |
| `android-theme.css` | Ánh xạ màu, nền, shape và một số style theo theme Android. |
| `camera-layout.css` | Ghi đè bố cục để tạo một khung camera dọc và hình bầu dục responsive. |
| `assets/android/` | Logo PNG và icon SVG được đưa từ tài nguyên Android; không phải tất cả asset đều đang được dùng trong JSX. |

CSS được import theo thứ tự trên trong `main.jsx`: quy tắc phía sau có thể ghi đè quy tắc phía trước khi độ ưu tiên CSS tương đương. Vì vậy phải xem cả bốn file, không kết luận giao diện hiện tại chỉ từ `styles.css`.

## 3. `main.jsx`: React khởi động thế nào?

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './android-tokens.css'
import './styles.css'
import './android-theme.css'
import './camera-layout.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
```

`index.html` chứa phần tử có id `root`. `document.getElementById('root')` tìm phần tử đó; `createRoot()` tạo React root và `render()` hiển thị component `App`. Các import CSS áp dụng style vào trang. `StrictMode` hỗ trợ phát hiện vấn đề trong lúc phát triển, có thể chạy thêm một số bước render/effect khi development; không nên hiểu đó là người dùng mở hai camera ở production.

## 4. `App.jsx`: import và model

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Camera, CameraOff, Check, RefreshCcw, X } from 'lucide-react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import { getCoverCrop } from './camera-crop.js'
```

- React hooks quản lý dữ liệu, tham chiếu và vòng đời; `flushSync` yêu cầu React cập nhật DOM đồng bộ ở chỗ được gọi.
- Lucide cung cấp icon; `FaceDetector` và `FilesetResolver` thuộc thư viện MediaPipe.
- `getCoverCrop` là hàm dự án tự viết. Logo và icon cảnh báo được import tiếp theo để Vite xử lý asset.
- `WASM` là URL thư mục WebAssembly của MediaPipe 0.10.21; `MODEL` là URL model BlazeFace short-range `.tflite`. Model có sẵn, không thấy code train model trong prototype. Cần mạng để tải tài nguyên nếu chúng chưa có sẵn trong cache.

## 5. State và ref khác nhau thế nào?

```jsx
const videoRef = useRef(null)
const streamRef = useRef(null)
const detectorRef = useRef(null)
const timerRef = useRef(null)
const sessionRef = useRef(0)
const [camera, setCamera] = useState('idle')
const [face, setFace] = useState('idle')
const [count, setCount] = useState(0)
const [photo, setPhoto] = useState(null)
const [error, setError] = useState('')
const [interrupted, setInterrupted] = useState(false)
```

`useState` dùng cho dữ liệu ảnh hưởng giao diện: trạng thái camera (`idle`, `loading`, `active`), trạng thái phát hiện (`idle`, `loading`, `searching`, `found`, `error`), số mặt, ảnh, lỗi và gián đoạn. Gọi setter yêu cầu React render lại.

`useRef` giữ giá trị qua các lần render mà thay `.current` không tự làm render lại: phần tử video, stream, detector, timer và số phiên. `sessionRef` giúp phát hiện kết quả bất đồng bộ đã cũ; nó không phải ID người dùng hay phiên đăng nhập.

## 6. Bấm bật camera: `start()`

```js
stop()
const session = sessionRef.current
setPhoto(null); setError(''); setCamera('loading')
const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
})
if (session !== sessionRef.current) {
  stream.getTracks().forEach(track => track.stop())
  return
}
```

`stop()` dọn phiên trước; sau đó lưu số phiên hiện tại, xóa ảnh/lỗi và chuyển UI sang loading. `getUserMedia` là API trình duyệt, không phải thư viện npm; nó xin quyền và trả Promise chứa `MediaStream`. `audio: false` không mở microphone. `facingMode: 'user'` và độ phân giải `ideal` chỉ là yêu cầu ưu tiên, không bảo đảm thiết bị đáp ứng chính xác.

Sau `await`, người dùng có thể đã tắt hoặc mở lại camera. Nếu số phiên không còn khớp, stream vừa nhận thuộc phiên cũ nên code dừng track ngay và không tiếp tục. Điều này xử lý một trường hợp race condition: kết quả đến sau khi người dùng đã đổi ý.

```js
video.setAttribute('playsinline', '')
video.setAttribute('webkit-playsinline', '')
video.muted = true
video.style.visibility = 'visible'
video.srcObject = stream
flushSync(() => setCamera('active'))
await video.play()
```

Stream được gắn vào video, các thuộc tính hỗ trợ phát trong trang trên Safari. `flushSync` khiến cập nhật `active` được đưa vào DOM trước `play()`, phục vụ tình huống video cần hiển thị để phát inline. Cách này không đảm bảo mọi trình duyệt nhúng hoạt động như Safari. Track còn có listener `mute`, `unmute`, `ended` để báo hoặc xử lý gián đoạn.

## 7. Phát hiện khuôn mặt

```js
const vision = await FilesetResolver.forVisionTasks(WASM)
const detector = await FaceDetector.createFromOptions(vision, {
  baseOptions: { modelAssetPath: MODEL },
  runningMode: 'VIDEO',
  minDetectionConfidence: 0.5
})
const result = detectorRef.current.detectForVideo(videoRef.current, performance.now())
setCount(result.detections.length)
setFace(result.detections.length ? 'found' : 'searching')
timerRef.current = setTimeout(scan, 250)
```

Resolver chuẩn bị runtime; `createFromOptions` tạo detector với model và chế độ video. `0.5` là ngưỡng tin cậy phát hiện, **không phải** ngưỡng so khớp danh tính. `performance.now()` cung cấp timestamp cho frame. Mỗi lượt, code chỉ quét nếu trang không ẩn, video không pause và `readyState >= 2`, rồi lên lịch lượt tiếp theo sau 250 ms; tốc độ thực tế còn phụ thuộc thời gian xử lý và thiết bị.

Code chỉ lấy số phần tử trong `detections`, không dùng bounding box để kiểm tra vị trí trong hình bầu dục. Có thể hiện “đã phát hiện” ngay cả khi mặt không nằm trong oval. Nếu detector không tải được, UI báo lỗi và camera vẫn có thể chụp.

## 8. Chụp ảnh: `capture()`

```js
const crop = getCoverCrop(video.videoWidth, video.videoHeight,
                          video.clientWidth, video.clientHeight)
const canvas = document.createElement('canvas')
canvas.width = crop.width; canvas.height = crop.height
const ctx = canvas.getContext('2d')
ctx.translate(canvas.width, 0); ctx.scale(-1, 1)
ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height,
              0, 0, canvas.width, canvas.height)
const image = canvas.toDataURL('image/jpeg', 0.92)
stop(); setError(''); setPhoto(image)
```

Trước đoạn này, code kiểm tra kích thước video, kích thước khung và track có `readyState === 'live'`, không muted, video không paused. Những kiểm tra này giảm một số trường hợp chụp frame cũ nhưng không chứng minh mọi luồng video đang cập nhật khung hình thực sự.

`videoWidth`/`videoHeight` là kích thước frame nguồn; `clientWidth`/`clientHeight` là kích thước phần tử hiển thị. Canvas cắt vùng giống preview, lật ngang bằng `translate`/`scale`, vẽ video rồi tạo chuỗi data URL JPEG chất lượng yêu cầu `0.92`. `setPhoto` giữ chuỗi trong bộ nhớ để render `<img>`; không tự lưu file hay gửi mạng.

## 9. Công thức `camera-crop.js`

```js
const scale = Math.min(frameWidth / viewWidth, frameHeight / viewHeight)
const width = Math.min(frameWidth, Math.max(1, Math.round(viewWidth * scale)))
const height = Math.min(frameHeight, Math.max(1, Math.round(viewHeight * scale)))
return { x: (frameWidth - width) / 2, y: (frameHeight - height) / 2, width, height }
```

Hàm nhận kích thước frame nguồn và khung hiển thị, kiểm tra tất cả là số hữu hạn dương rồi trả về hình chữ nhật cắt ở giữa. Ví dụ nguồn 1280×720 và khung 360×450: scale là `min(1280/360, 720/450) = 1.6`, vùng nguồn là 576×720, bắt đầu tại `(352, 0)`. Phần bên ngoài bị cắt vì preview dùng `object-fit: cover`. Test trong `camera-crop.test.js` kiểm tra frame ngang, dọc, cùng tỉ lệ và dữ liệu sai. Chạy `npm.cmd test`.

## 10. Tắt, dọn dẹp và khôi phục video

```js
sessionRef.current += 1
clearTimeout(timerRef.current)
streamRef.current?.getTracks().forEach(track => track.stop())
streamRef.current = null
if (videoRef.current) videoRef.current.srcObject = null
detectorRef.current?.close()
detectorRef.current = null
```

Đây là phần chính của `stop()`: tăng số phiên để vô hiệu kết quả cũ, hủy timer, dừng track camera, tách stream khỏi video và đóng detector. Code còn reset visibility và state. Cleanup effect `useEffect(() => () => { stop() }, [stop])` gọi dọn khi component bị tháo.

Effect còn lại nghe `visibilitychange`, `pageshow`, `webkitendfullscreen` và `pause`. Khi trang quay lại, nếu track đã hết thì báo bật lại; nếu còn sống thì thử `video.play()`. Event `mute`/`unmute`/`ended` theo dõi stream. Khi `play()` bị từ chối, giao diện cho mở lại. Không nên nói code này bảo đảm sửa mọi lỗi trình duyệt bên trong ứng dụng khác.

## 11. JSX và CSS quan trọng

```jsx
<video ref={videoRef} autoPlay muted playsInline disablePictureInPicture
  className={camera === 'active' && !photo ? 'visible' : ''} />
{photo && <img src={photo} alt="Ảnh khuôn mặt vừa chụp" />}
{camera === 'active' && !photo &&
  <div className={'face-guide' + (face === 'found' ? ' detected' : '')} aria-hidden="true" />}
```

`ref` nối phần tử DOM với `videoRef`. Điều kiện JSX quyết định hiển thị ảnh và oval; class `detected` đổi màu khi detector tìm thấy ít nhất một mặt. Nút gọi `start`, `stop` hoặc `capture` theo state. `role="status"`/`aria-live` giúp công nghệ hỗ trợ nhận biết cập nhật; oval có `aria-hidden` vì là trang trí.

`camera-layout.css` đặt `.viewport` tỷ lệ `4 / 5`, `object-fit: cover` và oval ở giữa bằng `position: absolute`, `transform`, `border-radius: 50%`. `pointer-events: none` giúp lớp hướng dẫn không chặn thao tác. Media query điều chỉnh kích thước; `prefers-reduced-motion` tắt transition nếu người dùng yêu cầu giảm chuyển động. `styles.css` lật preview video bằng `scaleX(-1)`; canvas cũng lật ảnh chụp để tương ứng.

## 12. Lỗi và giới hạn

`cameraError()` phân biệt môi trường không bảo mật, `NotAllowedError`, `NotFoundError`, `NotReadableError` và lỗi khác. Tên lỗi không đủ để suy ra chắc chắn một nguyên nhân duy nhất. MediaPipe báo lỗi riêng; chụp vẫn khả dụng. Video cần secure context như HTTPS hoặc localhost và quyền người dùng. Trên iPhone, mở bằng Safari; lỗi từng gặp ở trình duyệt nhúng Zalo không chứng minh tất cả WebView đều lỗi.

Chưa có đo benchmark FPS, độ chính xác, FAR/FRR, liveness hay kiểm thử đầy đủ các thiết bị. Model và WASM đang lấy từ mạng. Không có lưu trữ lâu dài, API, peer-to-peer hay đồng bộ. UI cho chụp ngay cả khi chưa thấy mặt: trạng thái detector chưa phải điều kiện bắt buộc chụp.

## 13. Câu hỏi vấn đáp thường gặp

**1. Vì sao cần `await getUserMedia()`?** Vì người dùng có thể mất thời gian cấp quyền; API trả Promise. Sau đó cần kiểm tra phiên có còn hợp lệ trước khi dùng stream.

**2. WebRTC nằm ở đâu? Có truyền video không?** Phần camera dùng `getUserMedia()` và `MediaStream`, thuộc các API media thường dùng cùng WebRTC. Chưa có `RTCPeerConnection`, signaling hay truyền peer-to-peer.

**3. MediaPipe và model có vai trò gì?** MediaPipe cung cấp runtime và API; BlazeFace là model có sẵn dùng để phát hiện. Hai thứ không tự thay thế thao tác xin quyền camera.

**4. Phát hiện có phải nhận diện không?** Không. Phát hiện tìm khuôn mặt; nhận diện cần bước trích xuất đặc trưng và đối sánh, cùng ngưỡng được đánh giá phù hợp.

**5. Tại sao dùng `useRef` thay vì state cho stream?** Để giữ đối tượng qua render và truy cập hiện tại mà không render lại chỉ vì đổi tham chiếu; state vẫn dùng cho những gì cần hiện ra.

**6. Tại sao phải `track.stop()` và `detector.close()`?** Để kết thúc việc sử dụng tài nguyên camera và detector khi không cần; xóa video khỏi giao diện đơn thuần không đủ để thể hiện đã giải phóng track.

**7. `sessionRef` giải quyết gì?** Tránh dùng stream/detector trả về sau khi phiên đã bị dừng hoặc thay thế. Đây là bảo vệ trước một số race condition, không phải cơ chế bảo mật.

**8. Tại sao ảnh có thể khác frame đầy đủ?** Khung preview dùng `cover` và cắt giữa; hàm crop cố gắng lấy đúng vùng tương ứng. Làm tròn kích thước có thể tạo sai khác nhỏ.

**9. Tại sao có HTTPS tunnel?** Camera yêu cầu secure context; IP LAN HTTP thông thường không thỏa điều kiện đó trên điện thoại. Tunnel tạo URL HTTPS cho việc thử nghiệm.

**10. Oval có nghĩa là đã căn đúng mặt?** Chưa. Đây là overlay tĩnh; code chưa đối chiếu bounding box với oval.

**11. Ngưỡng 0.5 là gì?** Ngưỡng tin cậy phát hiện mặt của detector, không phải độ giống nhau 50% hay ngưỡng xác thực.

**12. Ảnh có lên server không?** Code hiện tại không upload ảnh. Model/WASM tải từ URL bên ngoài; ảnh data URL chỉ nằm trong bộ nhớ trang và bị mất khi tải lại.

**13. Mở được camera Safari nghĩa là hoàn thành kiểm thử iOS?** Chưa. Cần ghi phiên bản máy/trình duyệt và thử các tình huống cấp/từ chối quyền, chụp lại, đổi tab, camera gián đoạn và điều kiện mạng.

**14. Sau này tích hợp server thế nào?** Khi có hợp đồng API, chuyển ảnh/crop thành Blob hoặc File và gửi theo định dạng, xác thực và xử lý lỗi đã thống nhất. Chưa có API nên không khẳng định endpoint hay cấu trúc dữ liệu cụ thể.

**15. Làm sao trình bày giới hạn AI?** Nêu rõ detector có thể bỏ sót hoặc phát hiện nhầm, chưa có đo đạc định lượng; oval và một ảnh không chứng minh người thật hoặc danh tính.
