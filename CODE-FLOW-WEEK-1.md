# Giải thích code và luồng xử lý Web — Tuần 1

Tài liệu đi theo thứ tự sử dụng ứng dụng. Mỗi mục đặt **nguyên đoạn code liên quan trước**, giải thích ngay bên dưới. Code được xuống dòng lại cho dễ đọc; các hàm được trình bày đầy đủ, không dùng dấu ba chấm để bỏ phần thân hàm.

Luồng đọc: khởi chạy React → chuẩn bị state/ref → mở camera và phát hiện mặt → chụp ảnh → dọn tài nguyên → xử lý gián đoạn.

## Camera hiện tại có dùng WebRTC không?

**Có, ở phần truy cập camera.** `navigator.mediaDevices.getUserMedia()` lấy `MediaStream` từ camera của trình duyệt, là cách được tài liệu WebRTC hướng dẫn cho việc thu hình. Code hiện tại gắn stream đó vào video, xử lý các frame và chụp ảnh. Chi tiết: [WebRTC — media devices](https://webrtc.org/getting-started/media-devices) và [WebRTC — tổng quan API](https://webrtc.org/getting-started/overview).

```text
getUserMedia() → MediaStream → <video playsInline> → canvas → ảnh chụp
                                    ↓
                           MediaPipe phát hiện mặt
```

MediaPipe chỉ xử lý phát hiện mặt; nó không thay thế hay mở camera thay cho `getUserMedia()`. `canvas` lấy frame để chụp ảnh. `facingMode: 'user'` ưu tiên camera trước, còn `playsInline` hỗ trợ phát video trong trang trên iPhone.

WebRTC còn có `RTCPeerConnection` để thiết lập truyền thông giữa các peer. Source hiện tại **không tạo kết nối peer và không truyền video trực tiếp qua mạng**. Yêu cầu tuần 1 được cung cấp chỉ nêu mở camera trước, hiển thị và chụp hình, nên phần thu hình hiện tại đáp ứng cách tiếp cận đó. Nếu sau này có yêu cầu truyền video trực tiếp, cần thiết kế kết nối và signaling theo yêu cầu lúc đó; hiện chưa có cơ sở khẳng định chắc chắn sẽ cần phần này.

## 1. Khởi chạy ứng dụng — toàn bộ `src/main.jsx`

```jsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './android-tokens.css'
import './styles.css'
import './android-theme.css'
import './camera-layout.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

Trình duyệt nạp file này từ `index.html`. `createRoot` gắn ứng dụng React vào phần tử có ID `root`; `App` là component chứa giao diện và logic tuần 1.

CSS được nạp lần lượt: token Android, giao diện Web, theme và bố cục camera. File cuối cùng có thể ghi đè các quy tắc bố cục trước đó. `StrictMode` hỗ trợ kiểm tra vòng đời trong môi trường phát triển, có thể chạy thêm chu kỳ setup/cleanup của effect.

### Đọc từng biểu thức

| Code | Ý nghĩa cụ thể |
|---|---|
| `import React from 'react'` | Nhận đối tượng được thư viện React export mặc định. Ở đây dùng `React.StrictMode`. |
| `import { createRoot } ...` | Nhận một export có tên `createRoot`; dấu ngoặc nhọn là cú pháp import có tên. |
| `import App from './App.jsx'` | Nạp component do file của nhóm export mặc định. `./` chỉ đường dẫn tương đối từ file hiện tại. |
| `import './styles.css'` | Nạp tài nguyên để tạo tác động về kiểu dáng, không gán giá trị vào một biến JavaScript. |
| `document.getElementById('root')` | Tìm phần tử DOM trong HTML; đây là API của trình duyệt. |
| `createRoot(...).render(...)` | Tạo nơi React quản lý giao diện rồi yêu cầu render cây component. |
| `<App />` | JSX mô tả một component; React sẽ gọi hàm `App` để tính giao diện. |

Luồng khởi chạy cụ thể là: tải HTML → nạp module `main.jsx` → nạp dependency và CSS → React gọi `App()` → nhận JSX → tạo/cập nhật DOM → gắn `videoRef` → thiết lập effect. Camera chưa được mở trong lần render đầu; nó chờ người dùng bấm nút.

**Render** là React chạy component để tính giao diện nên có. Nó không đồng nghĩa tải lại trang hoặc xin quyền camera một lần nữa. Khi `setFace()` cập nhật trạng thái, React có thể chạy lại `App()` và cập nhật dòng thông báo, trong khi stream được giữ trong ref vẫn tồn tại.

## 2. Thư viện và model — phần đầu `src/App.jsx`

```jsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  Camera, CameraOff, Check, CircleHelp, Focus,
  Image as ImageIcon, RefreshCcw, ScanFace, ShieldCheck, X
} from 'lucide-react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
```

React cung cấp các hook quản lý dữ liệu và vòng đời. `flushSync` được dùng tại thời điểm cần cập nhật DOM trước khi phát video. Lucide cung cấp biểu tượng giao diện.

MediaPipe cung cấp detector. `WASM` là địa chỉ runtime, `MODEL` là model BlazeFace short-range đã huấn luyện sẵn. Ứng dụng tải chúng để phát hiện mặt trên trình duyệt; source tuần 1 không có bước huấn luyện.

### Phân biệt ba thành phần xử lý mặt

| Thành phần | Vai trò |
|---|---|
| Package `@mediapipe/tasks-vision` | Cung cấp API JavaScript như tạo detector và truyền video vào detector. |
| Runtime WebAssembly | Thực thi phần tính toán được thư viện chuẩn bị cho trình duyệt. |
| File model `.tflite` | Chứa mô hình và trọng số đã học, được runtime sử dụng khi suy luận. |

Nạp package không có nghĩa model đã sẵn sàng. `start()` còn phải chờ runtime và model trước khi gọi `scan()`. Hai URL là dữ liệu cấu hình, không phải endpoint nhận ảnh của hệ thống. Source không gửi từng frame lên các URL này để nhờ nhận diện.

`Image as ImageIcon` chỉ đổi tên import để tránh nhầm lẫn với các tên khác trong code; đó là biểu tượng Lucide, không phải đối tượng chứa ảnh chụp.

## 3. Dữ liệu dùng trong component — toàn bộ phần khai báo state/ref

Đoạn này nằm đầu hàm `App()` trong `src/App.jsx`.

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

| Biến | Ý nghĩa |
|---|---|
| `videoRef` | Giữ phần tử video thật trong DOM. |
| `streamRef` | Giữ luồng camera đang hoạt động. |
| `detectorRef` | Giữ detector sau khi model đã sẵn sàng. |
| `timerRef` | Giữ timeout cho lần phát hiện tiếp theo. |
| `sessionRef` | Đánh số phiên để bỏ kết quả cũ khi người dùng mở lại camera. |
| `camera` | `idle`, `loading`, `active`: chưa mở, đang mở, đã gắn luồng video. |
| `face` | `idle`, `loading`, `searching`, `found`, `error`: trạng thái detector. |
| `count` | Số khuôn mặt trong lần phát hiện gần nhất. |
| `photo` | Chuỗi ảnh JPEG để hiển thị preview. |
| `error` | Thông báo lỗi đang hiển thị. |
| `interrupted` | Dấu hiệu video bị gián đoạn để hiện nút mở lại. |

**State đổi thì React cập nhật giao diện. Ref giữ tài nguyên qua các lần render và việc gán ref không tự làm render lại.**

### Vì sao khai báo như vậy?

`useState('idle')` trả về một cặp giá trị. Cú pháp `[camera, setCamera]` lấy phần tử thứ nhất làm giá trị hiện tại và phần tử thứ hai làm hàm yêu cầu cập nhật. `setCamera('loading')` không sửa trực tiếp biến `camera` của lần gọi hàm đang chạy; React sử dụng giá trị mới ở lần render kế tiếp. Nhiều cập nhật state có thể được React gom xử lý cùng nhau.

`useRef(null)` trả về một đối tượng có thuộc tính `.current`. Đối tượng ref được giữ qua các lần render. Ban đầu chưa có camera nên `.current` là `null`; khi mở được camera, code gán stream vào đó. Một biến thường được khởi tạo trong thân `App()` sẽ được khai báo lại mỗi lần React gọi component, nên không phù hợp để giữ tài nguyên này.

State được chọn cho **thông tin cần vẽ lên UI**; ref được chọn cho **đối tượng cần thao tác**. Ví dụ số mặt dùng state vì nó ảnh hưởng nội dung chữ; detector dùng ref vì việc có đối tượng detector không tự cần tạo một lần render.

Không đặt track, detector hoặc timer vào state giúp code giữ tài nguyên mà không phát sinh render chỉ vì thay tham chiếu tài nguyên. Tuy nhiên ref cũng không bảo đảm tự cleanup: `stop()` phải chủ động đóng chúng.

### Ví dụ trạng thái trong một lần sử dụng

| Thời điểm | `camera` | `face` | `photo` |
|---|---|---|---|
| Mới vào trang | `idle` | `idle` | `null` |
| Bấm bật, đang chờ quyền | `loading` | `idle` | `null` |
| Video đã được gắn và gọi phát | `active` | `loading` khi bắt đầu nạp detector | `null` |
| Detector chưa thấy mặt | `active` | `searching` | `null` |
| Detector thấy mặt | `active` | `found` | `null` |
| Chụp xong, các cập nhật đã render | `idle` | `idle` | Chuỗi ảnh JPEG |

Hàng cuối giải thích vì sao có thể hiện “Camera đang tắt” nhưng vẫn thấy ảnh: ảnh preview là dữ liệu đã chụp và đang giữ trong state, không phải video trực tiếp.

## 4. Mở camera và phát hiện mặt — toàn bộ hàm `start()`

Nút **Bật camera**, **Mở lại camera** và **Chụp lại** đều gọi hàm này.

```jsx
const start = async () => {
  stop()
  const session = sessionRef.current
  setPhoto(null)
  setError('')
  setCamera('loading')

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('unavailable')
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    })

    if (session !== sessionRef.current) {
      stream.getTracks().forEach(track => track.stop())
      return
    }

    streamRef.current = stream

    stream.getVideoTracks().forEach(track => {
      track.addEventListener('mute', () => {
        if (streamRef.current === stream) setInterrupted(true)
      })
      track.addEventListener('unmute', () => {
        if (streamRef.current === stream) setInterrupted(false)
      })
    })

    stream.getVideoTracks().forEach(track =>
      track.addEventListener('ended', () => {
        if (streamRef.current !== stream) return
        stop()
        setError('Camera đã ngừng hoạt động. Hãy bấm Bật camera để thử lại.')
      }, { once: true })
    )

    const video = videoRef.current
    // Safari cần phần tử video hiển thị trong trang trước khi phát inline.
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.muted = true
    video.style.visibility = 'visible'
    video.srcObject = stream
    flushSync(() => setCamera('active'))
    await video.play()

    if (session !== sessionRef.current) return
    setFace('loading')

    try {
      const vision = await FilesetResolver.forVisionTasks(WASM)
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5
      })

      if (session !== sessionRef.current) {
        detector.close()
        return
      }

      detectorRef.current = detector

      const scan = () => {
        if (
          session !== sessionRef.current ||
          !videoRef.current ||
          !detectorRef.current
        ) return

        try {
          if (
            !document.hidden &&
            !videoRef.current.paused &&
            videoRef.current.readyState >= 2
          ) {
            const result = detectorRef.current.detectForVideo(
              videoRef.current,
              performance.now()
            )
            setCount(result.detections.length)
            setFace(result.detections.length ? 'found' : 'searching')
          }

          timerRef.current = setTimeout(scan, 250)
        } catch {
          setFace('error')
        }
      }

      scan()
    } catch {
      if (session === sessionRef.current) setFace('error')
    }
  } catch (err) {
    if (session !== sessionRef.current) return
    stop()
    setError(cameraError(err))
  }
}
```

Đọc hàm theo năm bước:

1. **Chuẩn bị:** `stop()` dọn phiên trước; xóa ảnh/lỗi và đặt trạng thái đang mở.
2. **Xin camera:** `getUserMedia()` trả về stream sau khi được cấp quyền. `audio: false` không yêu cầu micro; `facingMode: 'user'` ưu tiên camera trước; độ phân giải `ideal` là mong muốn.
3. **Phát video:** gán stream vào `video.srcObject`, cập nhật DOM rồi gọi `play()`. Các listener track theo dõi tình trạng mất dữ liệu hoặc luồng kết thúc.
4. **Nạp detector:** chuẩn bị runtime và model. `minDetectionConfidence: 0.5` là ngưỡng phát hiện mặt, không phải ngưỡng đối sánh danh tính.
5. **Lặp phát hiện:** `scan()` kiểm tra frame, gọi `detectForVideo()`, lấy số mặt và đặt timeout cho lượt tiếp theo.

Các phép so sánh `session` giúp kết quả chờ của phiên cũ không tiếp tục điều khiển phiên mới. Đây là bỏ qua kết quả cũ, không hủy ngay yêu cầu tải mạng.

`scan()` được khai báo **bên trong** `start()`, nên giữ số phiên của lần mở camera đó. Khoảng chờ 250 ms cộng thêm thời gian xử lý không phải cam kết 4 FPS. Video vẫn phát theo luồng camera; detector chỉ đọc frame định kỳ. Suy luận hiện chạy đồng bộ trên main thread.

Hai lớp `try/catch` phân biệt lỗi camera với lỗi detector. Detector lỗi thì camera vẫn có thể chụp. Hiện lỗi tải model và lỗi suy luận đều dùng chung `face = 'error'`, nên thông báo chưa phân biệt đầy đủ.

### 4.1. Cú pháp cần hiểu trước khi đi từng bước

| Cú pháp trong hàm | Cách hiểu |
|---|---|
| `async () => { ... }` | Hàm mũi tên bất đồng bộ, trả về Promise và được phép dùng `await`. |
| `await getUserMedia(...)` | Tạm hoãn phần tiếp theo của hàm này tới khi Promise hoàn thành; trình duyệt vẫn có thể xử lý công việc khác. |
| `?.` | Optional chaining: nếu đối tượng bên trái là `null`/`undefined`, không cố truy cập tiếp gây lỗi tại điểm đó. |
| `!value` | Phủ định giá trị logic; với đối tượng, thường dùng để kiểm tra chưa tồn tại. |
| `!==` / `===` | So sánh khác/bằng nghiêm ngặt, không tự chuyển kiểu. Với stream object, so sánh tham chiếu. |
| `return` | Kết thúc hàm đang chạy; ngăn các bước phía sau tiếp tục xử lý phiên hết hiệu lực. |
| `try/catch` | Thử chạy đoạn code; lỗi ném ra trong phạm vi xử lý sẽ đi vào `catch`. |
| `track => ...` | Hàm callback nhận từng track; đăng ký callback sự kiện không có nghĩa callback chạy ngay. |

`await` không biến mọi thao tác thành chạy nền. Hai lệnh tải runtime/model trả Promise nên có thể chờ bất đồng bộ; `detectForVideo()` trong code này là lời gọi đồng bộ, JavaScript phải chờ nó trả kết quả mới đi tiếp.

### 4.2. Dòng chảy cụ thể của `start()`

| Câu lệnh/nhóm lệnh | Điều xảy ra và lý do |
|---|---|
| `stop()` | Đóng phiên cũ, đồng thời tăng số phiên. Một lần mở lại không giữ hai luồng/detector hoạt động song song có chủ ý. |
| `const session = sessionRef.current` | Chụp lại số phiên hiện tại cho riêng lần gọi này. Sau các `await`, dùng nó kiểm tra lần mở còn hợp lệ. |
| `setPhoto(null)` | Bỏ ảnh cũ để lần mở lại quay về camera. Vì vậy bấm Chụp lại không giữ ảnh cũ trên màn hình. |
| `setError('')` | Bỏ thông báo lần trước, tránh hiện lỗi cũ trong lần mở mới. |
| `setCamera('loading')` | Đổi UI sang đang mở và disable nút ở nhánh chờ. |
| Kiểm tra `getUserMedia` | Phát hiện API không khả dụng, có thể liên quan môi trường trình duyệt hoặc secure context. |
| `getUserMedia({...})` | Yêu cầu trình duyệt chọn thiết bị và thực hiện cấp quyền nếu cần. App không tự bỏ qua được hộp thoại quyền. |
| `if (session !== ...)` | Nếu người dùng đã đóng/mở lại trong khi chờ, luồng mới nhận thuộc phiên cũ phải dừng ngay. |
| `streamRef.current = stream` | Đưa luồng vào nơi các hàm khác như `capture()` và `stop()` có thể truy cập. |
| Đăng ký sự kiện track | Chuẩn bị xử lý khi track bị gián đoạn hoặc kết thúc. `mute/unmute` không phải thao tác người dùng bật/tắt micro. |
| `video.srcObject = stream` | Nối đầu ra camera vào phần tử video để trình duyệt hiển thị. |
| `flushSync(...)` | Buộc cập nhật DOM liên quan trạng thái active trước khi gọi phát. Không cần dùng cho mọi setter. |
| `await video.play()` | Chờ yêu cầu phát được chấp nhận; bị chặn hoặc lỗi sẽ đi vào catch ngoài. |
| `setFace('loading')` | Báo camera đã qua bước phát và detector đang chuẩn bị. |
| Hai lệnh khởi tạo MediaPipe | Nạp runtime và tạo detector theo model/options. |
| `detectorRef.current = detector` | Giữ detector để vòng scan và stop sử dụng. |
| `scan()` | Bắt đầu lượt phát hiện đầu tiên, sau đó tự lên lịch những lượt tiếp. |

`MediaStream` có thể hiểu là một nhóm đường dữ liệu; `MediaStreamTrack` là một đường hình hoặc âm thanh cụ thể. Ở đây không xin micro nên chủ yếu dùng video track. `getTracks()` lấy mọi track để đóng đầy đủ; `getVideoTracks()` chỉ lấy track hình để kiểm tra trạng thái.

`{ once: true }` ở sự kiện `ended` khiến listener đó chạy tối đa một lần. Chủ động gọi `track.stop()` không nên được hiểu là luôn làm sự kiện `ended` chạy; hàm `stop()` đã tự reset state và tài nguyên.

### 4.3. Vì sao cần số phiên? Ví dụ race condition

```text
Ban đầu sessionRef = 0
Bấm bật A → stop() tăng lên 1 → A giữ session = 1
A chờ tải model
Bấm mở lại B → stop() tăng lên 2 → B giữ session = 2
Model của A trả về → A so 1 với 2 → đóng detector A, return
Model của B trả về → B so 2 với 2 → được tiếp tục
```

Mỗi lần gọi `start()` có biến `session` riêng. `scan()` và các callback được tạo trong lần gọi đó vẫn nhớ các giá trị thuộc phạm vi của nó; đặc điểm này gọi là **closure**. Nếu không có kiểm tra, tác vụ chậm của A có thể ghi đè tài nguyên hoặc trạng thái mới của B.

### 4.4. Đọc chính xác vòng `scan()`

Ba điều kiện đầu bảo đảm phiên còn hợp lệ, DOM video còn và detector còn. Nếu sai, hàm kết thúc trước khi lên lịch lần mới.

Điều kiện `document.hidden` giúp tránh suy luận khi trang không hiển thị. `paused` phản ánh trạng thái phát của phần tử. `readyState >= 2` cho biết có dữ liệu cho vị trí phát hiện tại; nó không tự chứng minh đó là frame mới so với lượt scan trước.

`detectForVideo(video, performance.now())` nhận hình từ video và timestamp đơn điệu của trình duyệt, không cần ngày giờ lịch. Kết quả có mảng `detections`; `length` bằng 0 nghĩa là lần xử lý đó không có detection được giữ lại. Điều này không đủ để khẳng định ngoài đời hoàn toàn không có mặt: ánh sáng, góc, khoảng cách và model có thể ảnh hưởng kết quả.

`setFace(result.detections.length ? 'found' : 'searching')` dùng toán tử ba ngôi: điều kiện có giá trị đúng thì chọn vế trước dấu `:`, sai thì chọn vế sau. Số 0 được hiểu là sai trong điều kiện này.

`setTimeout(scan, 250)` đăng ký một lần gọi tương lai, không phải vòng `while` chạy liên tục. Nó nằm sau suy luận nên nếu mất khoảng 40 ms để suy luận thì hai lượt có thể cách khoảng 290 ms hoặc lâu hơn theo lịch trình duyệt. Timeout không cam kết thời gian chính xác. Nếu trang ẩn, lượt hiện tại bỏ suy luận nhưng vẫn lên lịch lại; trình duyệt có thể giảm tần suất timer nền.

### 4.5. Nếu lỗi xảy ra, nhánh nào chạy?

- Từ chối quyền, thiết bị không mở được hoặc `play()` bị từ chối: `catch` ngoài gọi `stop()` và hiện `cameraError(err)`.
- Nạp runtime/model hoặc tạo detector thất bại: `catch` giữa đặt `face = 'error'` nếu phiên vẫn hợp lệ; camera không bị chủ động đóng tại đó.
- Suy luận trong một lượt scan ném lỗi: `catch` trong scan đặt lỗi. Vì timeout nằm sau lời gọi suy luận, lượt sau chưa được đăng ký khi lỗi xảy ra, nên vòng dừng.

Lỗi từ listener xảy ra về sau không tự đi vào `try/catch` cũ chỉ vì listener được đăng ký trong khối try. Các callback ở đây có kiểm tra luồng và dùng xử lý Promise riêng khi cần.

## 5. Chụp ảnh — toàn bộ hàm `capture()`

```jsx
const capture = () => {
  const video = videoRef.current

  if (!video?.videoWidth || !video?.videoHeight) {
    setError('Camera chưa sẵn sàng. Hãy thử chụp lại.')
    return
  }

  const track = streamRef.current?.getVideoTracks()[0]

  if (!track || track.readyState !== 'live' || track.muted || video.paused) {
    setInterrupted(true)
    setError('Hình ảnh camera đang bị gián đoạn. Hãy mở lại camera trước khi chụp.')
    return
  }

  if (!video.clientWidth || !video.clientHeight) {
    setError('Khung camera chưa sẵn sàng. Hãy thử lại.')
    return
  }

  const crop = getCoverCrop(
    video.videoWidth, video.videoHeight,
    video.clientWidth, video.clientHeight
  )
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height

  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)

  const image = canvas.toDataURL('image/jpeg', 0.92)

  stop()
  setError('')
  setPhoto(image)
}
```

Luồng dữ liệu: **video → canvas → JPEG Data URL → state `photo` → ảnh trên giao diện**.

Hàm kiểm tra video đã sẵn sàng và track chưa gián đoạn. `getCoverCrop()` tính vùng giữa của frame tương ứng với preview `object-fit: cover`. Canvas có kích thước bằng vùng cắt tính theo pixel nguồn. Hai lệnh `translate` và `scale` lật ảnh ngang để giống preview; `drawImage` lấy vùng giữa đó và `toDataURL` mã hóa JPEG.

Sau khi có ảnh, code đóng camera/detector và lưu ảnh vào state. Ảnh chưa được crop theo mặt và chưa lưu bền vững; tải lại trang sẽ mất ảnh. Nút chụp hiện không yêu cầu tìm thấy mặt và không chặn nhiều mặt.

### Giải thích từng thao tác với ảnh

| Code | Ý nghĩa cụ thể |
|---|---|
| `videoRef.current` | Lấy DOM video đang nhận stream. |
| Kiểm tra `videoWidth/videoHeight` | Đây là kích thước nội dung hình, có thể bằng 0 trước khi video sẵn sàng. |
| `getVideoTracks()[0]` | Lấy video track đầu tiên của stream hiện tại. |
| Kiểm tra `readyState`, `muted`, `paused` | Loại một số tình huống không nên chụp vì luồng kết thúc, hình bị gián đoạn hoặc video tạm dừng. |
| `document.createElement('canvas')` | Tạo một vùng vẽ trong bộ nhớ; không cần chèn canvas vào DOM để dùng nó. |
| `canvas.width/height` | Đặt số pixel thật của vùng vẽ; khác với CSS chỉ thay kích thước hiển thị. |
| `getContext('2d')` | Lấy API vẽ hai chiều của canvas. |
| `translate(width, 0)` | Dời gốc tọa độ sang phía bên phải của vùng vẽ. |
| `scale(-1, 1)` | Đảo chiều trục X; ghép với translate để ảnh lật vẫn nằm trong vùng canvas. |
| `getCoverCrop(...)` | Tính tọa độ và kích thước vùng giữa của frame đang được hiển thị trong preview. |
| `drawImage(video, crop.x, crop.y, ...)` | Sao chép vùng cắt từ frame vào canvas theo hệ tọa độ đã lật. |
| `toDataURL(...)` | Mã hóa nội dung canvas thành chuỗi có dạng `data:image/jpeg;base64,...`. |
| `setPhoto(image)` | Giữ chuỗi đó trong React state và yêu cầu cập nhật UI. |

Ví dụ frame 1280 × 720 hiển thị trong ô 360 × 450: hàm chọn vùng giữa 576 × 720, bắt đầu từ x = 352. Ảnh giữ kích thước vùng cắt theo pixel nguồn, không chỉ có 360 × 450 pixel theo CSS.

CSS preview dùng `object-fit: cover` và căn giữa. Canvas lấy vùng tương ứng từ video thật, không chụp oval hoặc các phần tử HTML phủ lên video. Đây là cắt theo khung preview, chưa phải crop theo bounding box khuôn mặt.

Thứ tự `drawImage → toDataURL → stop` rất quan trọng: cần lấy frame và giữ ảnh trước khi bỏ stream khỏi video. Sau đó ảnh preview độc lập với camera nên camera tắt vẫn xem ảnh được.

Ảnh Data URL là chuỗi dữ liệu, không phải đường dẫn file đã lưu trên máy. Tham số 0.92 ảnh hưởng mã hóa JPEG, không đánh giá mặt đủ sáng, nét hay đúng người. Muốn tải ảnh về hoặc crop mặt cần luồng riêng; code hiện chưa có.

## 6. Tắt camera, dọn detector — toàn bộ hàm `stop()`

```jsx
const stop = useCallback(() => {
  sessionRef.current += 1
  clearTimeout(timerRef.current)
  streamRef.current?.getTracks().forEach(track => track.stop())
  streamRef.current = null

  if (videoRef.current) {
    videoRef.current.srcObject = null
    videoRef.current.style.visibility = ''
  }

  detectorRef.current?.close()
  detectorRef.current = null

  setCamera('idle')
  setFace('idle')
  setCount(0)
  setInterrupted(false)
}, [])
```

Hàm tăng số phiên, hủy timeout, dừng track, bỏ stream khỏi video và đóng detector. Nhờ vậy các lượt chờ của phiên cũ sẽ hết hiệu lực và tài nguyên camera/AI được giải phóng.

`useCallback` giữ tham chiếu hàm ổn định qua các lần render. Các tài nguyên được lấy qua ref hiện tại. `stop()` không xóa `photo` hoặc `error`, vì hàm gọi quyết định có giữ ảnh/thông báo hay không.

Ví dụ: khi `capture()` gọi `stop()` rồi `setPhoto(image)`, camera được đóng nhưng ảnh vẫn xuất hiện.

### Vì sao phải đóng từng tài nguyên?

| Thao tác | Vấn đề giải quyết |
|---|---|
| Tăng số phiên | Kết quả cũ sau `await` không được phép tiếp tục xử lý. |
| `clearTimeout` | Chặn lần gọi scan đã lên lịch nhưng chưa thực thi; không ngắt được một lời gọi suy luận đồng bộ đang chạy giữa chừng. |
| `track.stop()` | Báo rằng ứng dụng không còn sử dụng track; chỉ xóa biến stream chưa đủ để chủ động dừng track. |
| `srcObject = null` | Bỏ nguồn hình khỏi phần tử video. |
| `detector.close()` | Giải phóng tài nguyên do MediaPipe quản lý theo API của detector. |
| Gán các ref về `null` | Không để các hàm sau tưởng tài nguyên cũ vẫn còn dùng được. |
| Reset state | UI phản ánh đã dừng thay vì tiếp tục hiện trạng thái của phiên trước. |

`useCallback(..., [])` lưu tham chiếu hàm; nó không có nghĩa hàm chỉ được chạy một lần. Người dùng bấm tắt bao nhiêu lần thì callback vẫn có thể được gọi bấy nhiêu lần. Nhờ kiểm tra `?.` và dọn về `null`, gọi lại khi đã dừng không cố truy cập stream/detector không tồn tại.

Mảng dependency rỗng phù hợp ở đây vì callback chủ yếu đọc ref và dùng setter state ổn định. Nếu sau này hàm đọc thêm state hoặc prop theo giá trị của lần render, cần xem lại dependency để tránh dùng dữ liệu cũ.

## 7. Khôi phục video khi quay lại trang — toàn bộ effect

```jsx
useEffect(() => {
  const resumeVideo = () => {
    const video = videoRef.current
    const stream = streamRef.current

    if (document.hidden || !video || !stream) return

    if (!stream.getVideoTracks().some(track => track.readyState === 'live')) {
      stop()
      setError('Camera đã dừng khi bạn rời trang. Hãy bấm Bật camera để tiếp tục.')
      return
    }

    video.play()
      .then(() => setInterrupted(false))
      .catch(() => {
        if (streamRef.current === stream) setInterrupted(true)
      })
  }

  const video = videoRef.current

  document.addEventListener('visibilitychange', resumeVideo)
  window.addEventListener('pageshow', resumeVideo)
  video?.addEventListener('webkitendfullscreen', resumeVideo)
  video?.addEventListener('pause', resumeVideo)

  return () => {
    document.removeEventListener('visibilitychange', resumeVideo)
    window.removeEventListener('pageshow', resumeVideo)
    video?.removeEventListener('webkitendfullscreen', resumeVideo)
    video?.removeEventListener('pause', resumeVideo)
  }
}, [stop])
```

Effect gắn listener cho các sự kiện hiển thị trang và phát video. Nếu trang đang hiển thị và track còn sống, nó thử phát lại; nếu track đã kết thúc, nó dọn camera và báo người dùng bật lại.

Hàm sau `return` tháo listener khi cleanup. Các callback luôn lấy ref hiện tại. Thuộc tính `video.muted` là tắt âm thanh phần tử; sự kiện `mute` của track video trong `start()` là tình trạng dữ liệu hình bị gián đoạn.

Trong lần thử đã ghi nhận, camera bị toàn màn hình/đơ trong trình duyệt Zalo, còn Safari trực tiếp hoạt động bình thường. Chưa xác nhận đã sửa được Zalo.

### Effect hoạt động lúc nào?

`useEffect` được dùng để nối React với sự kiện của trình duyệt. Callback setup không chạy trong quá trình tính JSX; nó được React thiết lập sau khi giao diện được commit. Dependency `[stop]` khiến effect thiết lập lại khi tham chiếu `stop` đổi. Trong code hiện tại `stop` được giữ ổn định bằng `useCallback`.

| Sự kiện | Vì sao theo dõi? |
|---|---|
| `visibilitychange` | Người dùng đổi tab, chuyển ứng dụng hoặc trở lại trang. Handler kiểm tra `document.hidden` để chỉ thử phát khi trang hiển thị. |
| `pageshow` | Trang được hiển thị, trong đó có một số trường hợp quay lại qua lịch sử trình duyệt. |
| `webkitendfullscreen` | Nhận tín hiệu thoát chế độ video toàn màn hình trên môi trường WebKit có hỗ trợ. |
| `pause` | Phần tử video chuyển sang trạng thái tạm dừng. |

`some(track => track.readyState === 'live')` hỏi “có ít nhất một track còn sống không?”. Nếu không có, phát lại cùng video không khôi phục được track đã kết thúc, nên code yêu cầu mở camera mới.

`video.play()` trả Promise: `.then()` xử lý khi yêu cầu phát thành công; `.catch()` xử lý khi bị từ chối. So sánh stream trong catch giúp kết quả lỗi của stream cũ không đặt cờ gián đoạn cho stream mới. Nhánh thành công hiện đặt `interrupted = false` trực tiếp; không nên hiểu đây là một bộ quản lý mọi race condition hoặc phát hiện mọi kiểu đơ frame.

Callback được truyền vào `addEventListener` phải được dùng lại đúng tham chiếu khi gọi `removeEventListener`. Vì vậy cleanup sử dụng chính hàm `resumeVideo` được tạo trong lần setup đó. Nếu chỉ bỏ qua cleanup, những lần thiết lập sau có thể để lại listener thừa.

Hàm giữ `const video = videoRef.current` ở setup để tháo listener khỏi đúng DOM node đã đăng ký; bên trong handler lại đọc ref mới nhất để thao tác tài nguyên hiện tại.

## 8. Dọn khi component bị tháo — toàn bộ effect cleanup

```jsx
useEffect(() => () => { stop() }, [stop])
```

Mũi tên ngoài là callback thiết lập effect; mũi tên trong là hàm cleanup React nhận lại. Khi cleanup chạy, `stop()` giải phóng tài nguyên. Đoạn này không gọi `stop()` sau mỗi lần render.

Có thể đọc biểu thức này thành câu: “React, khi thiết lập effect, hãy nhận lại một hàm; khi đến lúc cleanup, hãy gọi hàm đó, và hàm đó sẽ gọi `stop()`.” Cleanup chạy khi component unmount, trước một lần setup lại nếu dependency đổi, và trong chu kỳ kiểm tra bổ sung của StrictMode ở môi trường phát triển.

Việc đóng tab là một tình huống trình duyệt tự quản lý thêm; không nên xem effect cleanup là cơ chế bảo đảm mọi sự kiện đóng tab đều chạy JavaScript tới cuối. Trong phạm vi React, nó giúp giải phóng tài nguyên khi component bị tháo khỏi cây giao diện.

## 9. Chọn thông báo lỗi — toàn bộ hàm `cameraError()`

```jsx
function cameraError(error) {
  if (!window.isSecureContext)
    return 'Camera cần HTTPS hoặc localhost. Hãy mở lại trang bằng địa chỉ bảo mật.'

  if (error?.name === 'NotAllowedError')
    return 'Quyền camera đã bị từ chối. Hãy cấp quyền trong cài đặt trình duyệt rồi thử lại.'

  if (error?.name === 'NotFoundError')
    return 'Không tìm thấy camera trên thiết bị này.'

  if (error?.name === 'NotReadableError')
    return 'Camera đang bận hoặc không thể truy cập. Hãy đóng ứng dụng khác và thử lại.'

  return 'Không thể mở camera. Hãy kiểm tra thiết bị và thử lại.'
}
```

Hàm nhận lỗi rồi trả chuỗi thông báo. Phần `catch` của `start()` gọi `setError(cameraError(err))` để hiện thông báo. Hàm này không tự sửa camera hoặc xin quyền lại.

Thứ tự điều kiện có tác động: môi trường không bảo mật được kiểm tra trước, nên sẽ ưu tiên hướng dẫn HTTPS. `error?.name` tránh lỗi phụ khi đối tượng lỗi không có hoặc khác dự kiến. Nếu không khớp các tên được biết, dòng `return` cuối cung cấp thông báo chung.

Đây là bản diễn giải lỗi đơn giản cho prototype. Một tên lỗi có thể có nhiều nguyên nhân phía quyền, hệ điều hành hoặc trình duyệt; nhánh `NotAllowedError` không chứng minh duy nhất rằng người dùng đã bấm Từ chối. Khi debug thực tế nên kiểm tra thêm đối tượng lỗi và môi trường.

## 10. Hiển thị video và ảnh — đoạn JSX trong khung camera

Đây là nguyên phần tử video và nhánh hiển thị ảnh, nằm trong `return` của `App`:

```jsx
<video
  ref={videoRef}
  autoPlay
  muted
  playsInline
  disablePictureInPicture
  className={camera === 'active' && !photo ? 'visible' : ''}
/>
{photo && <img src={photo} alt="Ảnh khuôn mặt vừa chụp" />}
```

`ref` nối phần tử video với logic đã đọc ở trên. Khi `photo` có giá trị, JSX tạo thẻ ảnh với chuỗi JPEG đó. Video dùng inline playback và ảnh preview dùng cùng hướng lật với video.

Khung góc trắng trên video là khung hướng dẫn cố định bằng CSS, chưa phải bounding box bám theo khuôn mặt.

### Cách đọc JSX và thuộc tính

| JSX | Ý nghĩa |
|---|---|
| `ref={videoRef}` | Sau khi DOM được gắn, React đặt phần tử video vào `videoRef.current`. |
| `autoPlay` | Yêu cầu video tự phát khi đủ điều kiện; vẫn chịu chính sách trình duyệt. Code còn chủ động gọi `play()`. |
| `muted` | Đặt phần tử ở chế độ tắt âm, phù hợp cho preview; không đồng nghĩa đã dừng camera. |
| `playsInline` | Yêu cầu phát trong trang thay vì bắt buộc mở giao diện video toàn màn hình. |
| `disablePictureInPicture` | Yêu cầu hạn chế chế độ Picture-in-Picture ở nơi trình duyệt hỗ trợ. |
| `className={...}` | Dùng biểu thức JavaScript trong dấu ngoặc nhọn để chọn lớp CSS. |
| `{photo && <img .../>}` | Chỉ tạo nhánh ảnh khi `photo` có giá trị có thể xem là đúng. |

JSX gần giống HTML nhưng là cú pháp mô tả giao diện trong JavaScript. Tên component viết hoa như `<Camera />` được React hiểu là component; tên viết thường như `<video>` là phần tử DOM.

CSS đang đặt video ở trạng thái ẩn ban đầu; `start()` còn chủ động đặt `video.style.visibility = 'visible'`. Inline style này ưu tiên hơn quy tắc visibility trong stylesheet thông thường, và `stop()` xóa nó để trả về quy tắc CSS. Vì vậy chỉ nhìn `className` chưa đủ hiểu toàn bộ trạng thái hiển thị.

## 11. Nút gọi hàm nào? — toàn bộ khối JSX actions

```jsx
<div className="actions">
  {camera === 'active' ? (
    <>
      <button className="btn secondary" onClick={stop}>
        <CameraOff size={18}/> Tắt camera
      </button>

      <button className="btn primary" onClick={capture}>
        <Camera size={18}/> Chụp ảnh
      </button>
    </>
  ) : (
    <button
      className="btn primary"
      onClick={start}
      disabled={camera === 'loading'}
    >
      {photo ? <RefreshCcw size={18}/> : <Camera size={18}/>}
      {photo ? 'Chụp lại' : camera === 'loading' ? 'Đang mở...' : 'Bật camera'}
    </button>
  )}
</div>
```

Nhánh camera đang bật có nút tắt và chụp. Nhánh còn lại có một nút dùng chung để bật/chụp lại; nút bị vô hiệu khi đang chờ mở. Khi phát hiện gián đoạn, thông báo riêng có nút mở lại camera.

`onClick={start}` truyền hàm cho React gọi lúc bấm. Không viết `onClick={start()}`, vì cách đó gọi hàm ngay trong lúc render.

### Điều kiện hiển thị các nút

| Trạng thái | Nhánh và hành động |
|---|---|
| `camera = 'idle'`, chưa có ảnh | Nhánh sau dấu `:`, nút Bật camera gọi `start`. |
| `camera = 'loading'` | Cùng nhánh nhưng nút disabled; tên Đang mở. |
| `camera = 'active'` | Nhánh đầu, có hai thao tác `stop` và `capture`. |
| Chụp xong | `stop()` đặt camera idle; `photo` có ảnh nên tên nút trở thành Chụp lại và vẫn gọi `start`. |

`<>...</>` là Fragment: gom các phần tử cùng nhánh mà không thêm một thẻ bọc vào DOM. `aria-label` đặt tên cho nút chỉ có biểu tượng để công cụ hỗ trợ đọc được; `title` cung cấp gợi ý ở các môi trường có hỗ trợ.

Đây là liên kết từ giao diện tới logic: **người dùng bấm → React gọi handler → handler thao tác tài nguyên và cập nhật state → React render giao diện mới**. Event handler không cần tự tìm rồi sửa text của từng nút bằng DOM API.

## 12. Chuyển kết quả detector thành chữ — toàn bộ khai báo `faceText`

```jsx
const faceText = {
  idle: 'Đang chờ camera',
  loading: 'Đang tải bộ phát hiện...',
  searching: 'Chưa thấy khuôn mặt',
  found: count > 1 ? `Phát hiện ${count} khuôn mặt` : 'Đã phát hiện khuôn mặt',
  error: 'Không tải được bộ phát hiện'
}[face]
```

`[face]` chọn thông báo từ object theo state hiện tại. `scan()` cập nhật state; React render lại và chọn chuỗi mới. Nếu có nhiều mặt, nội dung dùng `count`.

Ví dụ `face = 'found'`, `count = 2`: vế `count > 1` đúng, template literal thay `${count}` bằng số 2 và tạo “Phát hiện 2 khuôn mặt”. Nếu `face = 'searching'`, chuỗi được lấy từ khóa searching dù count còn giữ giá trị gì ở thời điểm đọc.

`faceText` là giá trị tính lại từ state trong mỗi render, không phải một state thứ hai cần cập nhật riêng. Điều này tránh phải đồng bộ thêm một biến thông báo với `face` và `count`.

## 13. Vị trí code và điểm debug

### Một lượt chạy hoàn chỉnh để theo dõi bằng mắt

1. Trang mới mở: chưa có stream/detector, nút Bật camera hiện ra.
2. Bấm nút: `start()` dọn phiên và đặt loading; trình duyệt có thể hỏi quyền.
3. Cấp quyền: stream được nhận, lưu vào ref và gắn vào video; video phát.
4. Detector đang tải: hình có thể đã chuyển động trong lúc chữ còn báo đang tải bộ phát hiện.
5. Detector sẵn sàng: scan đọc frame, nếu thấy mặt thì UI báo phát hiện. Những lần scan sau tái sử dụng detector.
6. Bấm Chụp: canvas giữ một frame, ảnh được mã hóa; camera/detector đóng và ảnh được hiển thị.
7. Bấm Chụp lại: xóa ảnh preview, mở một phiên mới và tạo detector mới theo logic hiện tại. Trình duyệt có thể tái sử dụng quyền đã cấp và tài nguyên tải đã cache, nhưng code vẫn chạy quy trình khởi tạo.

Nếu chưa hiểu một bước, đặt breakpoint ở điểm tương ứng bên dưới rồi kiểm tra biến trước và sau câu lệnh. Lúc bấm tiếp từng bước, đừng nhầm việc video/debugger tạm dừng với lỗi hiệu năng của ứng dụng.

| Muốn hiểu | Mở ở đâu? | Quan sát |
|---|---|---|
| Khởi chạy | `src/main.jsx` | `createRoot` và `App`. |
| Quyền camera | `start()` sau `getUserMedia` | `stream.getVideoTracks()[0].getSettings()`. |
| Video có phát không | Sau `await video.play()` | `paused`, `readyState`, `videoWidth`, `videoHeight`. |
| Phát hiện mặt | `scan()` sau `detectForVideo` | `result.detections`. |
| Chụp ảnh | `capture()` trước `drawImage` | Track, trạng thái video và kích thước canvas. |
| Giải phóng | `stop()` | Stream, detector và số phiên trước/sau. |

Không giữ breakpoint lâu trong vòng phát hiện khi đánh giá độ mượt, vì debugger sẽ tạm dừng JavaScript.

## 14. Kết quả và phạm vi tuần 1

Các chức năng chính cho demo đã có: mở camera, chụp/xem ảnh và phát hiện mặt. Người dùng đã xác nhận detect trên máy tính và camera hoạt động khi mở trực tiếp Safari iPhone; build production đã thành công.

Chưa có kết quả kiểm thử riêng cho mọi ca từ chối quyền, camera bận, đổi app và mọi thiết bị. Chưa ghi nhận model iPhone/phiên bản iOS cụ thể. Lỗi trình duyệt Zalo vẫn được ghi nhận.

Ảnh hiện chỉ nằm trong state; chưa có upload ảnh trong source. Model/runtime tải từ CDN, còn xử lý frame chạy trên trình duyệt. Cloudflare Tunnel dùng để đưa bản Web qua HTTPS tới điện thoại, không xử lý nhận diện. Xem [README](README.md) để tự chạy tunnel.

Phát hiện mặt chưa xác định danh tính, chưa crop theo bounding box mặt và chưa kiểm tra người thật. Ảnh được cắt theo vùng preview hình chữ nhật, không cắt theo oval. Đây là phạm vi thực tế của prototype tuần đầu.
