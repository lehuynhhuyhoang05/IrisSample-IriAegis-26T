# Liveness Web: phản xạ ánh sáng từ chối người thật trên iPhone

Ngày ghi nhận: 15/11/2026. Tài liệu dùng để trao đổi với nhóm 4; chưa phải kết luận nguyên nhân phần cứng hoặc kết quả đánh giá độ chính xác.

**Phiên bản:** số đo ở mục 1–10 được thu trước cập nhật nhóm 4 `a9be597`, với flash toàn màn hình, ngưỡng 0,280/0,040/0,040 và đối xứng baseline. Bản Web hiện đã dùng flash vùng ngoài khung và ngưỡng mới của nhóm 4; xem [mục cập nhật](LIVENESS.md#7-cập-nhật-nguồn-nhóm-4-ngày-17112026). Không áp ngưỡng mới để đổi kết quả lịch sử thành bằng chứng bản mới đã ổn định trên iPhone.

## 1. Hiện tượng và số đo

Người dùng đã hoàn thành luồng trên laptop. Hai lần thử bằng người thật trên iPhone đi đến kiểm tra ánh sáng nhưng không đạt. Video vẫn được xử lý qua nguồn `timer`, GPU; không còn bị dừng ở lỗi watchdog trong hai lần này.

| Chỉ số | Điều kiện nhóm 4 | Laptop đã đạt | iPhone lần 1 | iPhone lần 2 |
|---|---|---|---|---|
| Shift đỏ/xanh | ≥ 0,280 | 0,682 | 0,347 — đạt | 0,278 — thiếu |
| normR | ≥ 0,040 | 0,083 | 0,057 — đạt | 0,046 — đạt |
| normB | ≥ 0,040 | 0,069 | 0,038 — thiếu | 0,032 — thiếu |
| Đối xứng baseline | Phải đạt | Đạt | Đạt | Đạt |
| Mẫu nền/đỏ/xanh | Mỗi pha có mẫu hợp lệ | 3/4/4 | 3/4/4 | 3/5/5 |

Đây là số hiển thị đã làm tròn do người dùng cung cấp. Việc quyết định trong code dùng số gốc, không dùng số trên màn hình.

Các điều kiện được kết hợp bằng **AND**, đúng `FaceCaptureActivity.evaluateRedBlueRatioCycle()` của nhóm 4 tại commit `be89383530aa5845cf793a7cd4db90478f20f445`. Do đó hai kết quả iPhone đều bị chặn theo công thức hiện có. Không đủ cơ sở xem đây là lỗi toán học hoặc tự làm tròn `0,038` thành `0,040`.

Việc bị chặn ở bước ánh sáng **chưa phải nhãn FAKE từ MiniVision**: ảnh chưa được gửi đến API MiniVision. Những lần này chưa có kết quả đối sánh danh tính hay điểm danh server.

## 2. Điều kiện đã biết và phần còn thiếu

- Người dùng cho biết độ sáng iPhone gần tối đa, True Tone tắt. Chưa ghi nhận trạng thái Night Shift; không mặc định tính năng này bật hoặc tắt.
- UI báo không xác nhận khóa đủ phơi sáng/cân bằng trắng. Cần file số đo để biết chính xác thuộc tính nào không khóa được; cảnh báo này không tự chứng minh đó là nguyên nhân duy nhất.
- Các pha có 3–5 mẫu được nhận; có mẫu không chứng minh tất cả frame đã phản ánh đúng màu vật lý trên màn hình.
- Chưa có model iPhone/iOS, điều kiện ánh sáng phòng, khoảng cách mặt–màn hình và phân bố RGB từng frame của hai lần lỗi cũ.
- RGB Android được tính từ NV21; Web đọc pixel qua canvas. Việc giữ nguyên công thức không chứng minh cùng đặc tính màu, độ trễ hoặc tỷ lệ sai trên hai pipeline.

## 3. Giả thuyết cần kiểm tra

1. Frame đầu mỗi pha còn phản ánh màu trước do độ trễ hiển thị/camera, làm trung bình bị trộn. Kiểm tra chuỗi RGB theo thời gian sau đổi màu.
2. Camera tự bù phơi sáng hoặc cân bằng trắng làm giảm biến thiên xanh. Cần ghi trạng thái khóa và so sánh trên thiết bị hỗ trợ/không hỗ trợ.
3. Cường độ/phổ màn hình và ánh sáng môi trường tạo phản xạ không đủ. Độ sáng gần tối đa không loại trừ giả thuyết này, nhưng không được quy lỗi mặc định cho người dùng.
4. Ngưỡng đang dùng chưa được hiệu chuẩn trên dữ liệu Safari/iOS. Hai ca người thật bị từ chối là tín hiệu cần khảo sát, chưa đủ để chọn ngưỡng mới hay kết luận tỷ lệ lỗi.

## 4. Dữ liệu có thể thu ngay từ Web

Sau một lần kiểm tra ánh sáng, mở **Thông tin kiểm tra → Tải số đo ánh sáng (.json)**. File có:

- Thông tin trình duyệt, viewport, nguồn frame, delegate GPU/CPU và trạng thái khóa camera.
- Trung bình RGB từng pha, số mẫu, các điểm đo, ngưỡng và danh sách điều kiện không đạt.
- RGB trung bình vùng lõi mặt của từng frame đã được dùng, cùng thời gian sau xác nhận cập nhật màu.
- Không có ảnh, video, mật khẩu, token hoặc tài khoản. File chỉ tải khi người dùng bấm nút; Web không tự gửi báo cáo đến nhóm khác.

Chuỗi số đo chỉ mô tả các frame được chấp nhận. Nó chưa đo chính xác lúc màn hình vật lý phát màu, và không phải bằng chứng server đã xác minh.

## 5. Hướng phối hợp nhóm 4

1. Thu báo cáo các lần người thật đạt/không đạt và các lần thử ảnh in, ảnh điện thoại, video phát lại, có nhãn điều kiện thử. Không chỉ thu các ca gần ngưỡng rồi điều chỉnh để chúng đạt.
2. So sánh Android native với Web trên cùng một thiết bị Android để tách sai lệch nền tảng khỏi sai lệch phần cứng; ghi iPhone như nhóm thiết bị riêng.
3. Nếu trace cho thấy trộn màu hoặc lệch thời điểm, sửa cách lấy mẫu rồi kiểm thử lại cả người thật và tấn công. Không chọn riêng các frame có điểm cao để cho qua.
4. Nếu cần hiệu chuẩn, nhóm 4 thống nhất tiêu chí chấp nhận và đánh giá sai chấp nhận/sai từ chối trên tập dữ liệu tách biệt. Chỉ thay ngưỡng có phiên bản sau khi được thống nhất và kiểm chứng.
5. Nếu không thể làm phép đo màu đáng tin cậy trên trình duyệt không khóa AE/AWB, cần quyết định phương án liveness khác đã kiểm chứng. Không tự bỏ bước flash, thay nó bằng MediaPipe face detection hoặc coi MiniVision một ảnh là toàn bộ luồng chủ động.

## 6. Trạng thái thay đổi frontend

Đã bổ sung điều kiện không đạt cụ thể và báo cáo RGB theo frame để điều tra. Giữ nguyên ngưỡng `0,280 / 0,040 / 0,040`, giữ phép AND và tiếp tục chặn sử dụng ảnh khi flash không đạt. Chưa xác nhận giải quyết việc từ chối người thật trên iPhone; cần số đo mới từ thiết bị thật.

Tham khảo: [source Android nhóm 4](https://github.com/Long965/IrisSample-IriAegis-26T/tree/be89383530aa5845cf793a7cd4db90478f20f445), [tích hợp Web](LIVENESS.md), [Apple: màu và độ sáng màn hình](https://support.apple.com/en-euro/109351), [Canvas: không gian màu](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData).

## 7. Thu số đo khi giao diện không bật debug — 16/11/2026

Người dùng xác nhận thử bằng Safari trực tiếp: laptop đạt, iPhone có lần đạt và có lần bị từ chối phản xạ ánh sáng. Hai ảnh mới chỉ hiện lời nhắc cho người dùng, không có số đo; chưa thể kết luận nguyên nhân giống hai lần normB thấp ở bảng trên. Chưa có mẫu máy/iOS cho đợt thử này.

Sau lỗi ở bước ánh sáng, màn hình có nút nhỏ **Lưu thông tin lỗi**. Thử lại vài lượt trên cùng trang rồi tải `iriaegis-camera-support.json`; bộ nhớ giữ tối đa 5 lượt đã đo xong, cả đạt và không đạt. Tải lại trang sẽ xóa lịch sử này. File chỉ được tải khi người dùng bấm nút, không tự gửi đi, không ghi localStorage. File chứa:

- Ngưỡng, điều kiện không đạt, RGB trung bình từng pha và từng frame; không có pixel ảnh/video, tên sinh viên, tài khoản hay token.
- Thời điểm yêu cầu và xác nhận hiển thị màu sau hai animation frame, kích thước/màu CSS của lớp flash. Đây là xác nhận lịch vẽ của Web, chưa chứng minh ánh sáng đã đến cảm biến.
- Timestamp frame, khoảng thời gian từ lúc xác nhận màu, metadata thời gian nếu trình duyệt cung cấp; số mẫu bị bỏ do chưa hiển thị, chưa ổn định, timestamp cũ hoặc RGB không hợp lệ.
- Kích thước/tốc độ camera và khả năng khóa phơi sáng/cân bằng trắng nếu trình duyệt cho biết; không lưu deviceId/groupId. User agent và kích thước viewport giúp đối chiếu nền tảng.

Nút này không mở lại bảng debug trên màn tác vụ. Các số đo chỉ bổ sung khả năng điều tra; không thay cách lấy mẫu, thời lượng, ngưỡng hoặc kết quả xác thực. Flash không đạt vẫn chặn ảnh và không gửi MiniVision. Cần đối chiếu báo cáo đạt/không đạt trên cùng iPhone trước khi quyết định sửa phép đo. Kiểm thử bằng frame tổng hợp chỉ xác nhận điều phối và tải file, không chứng minh đã khắc phục độ chính xác trên iPhone thật.

## 8. Phân tích hai file hỗ trợ ngày 17/11/2026

Đã đọc `iriaegis-camera-support (1).json` và `iriaegis-camera-support 2.json` do trưởng nhóm cung cấp. Có **hai lượt khác nhau**, không phải ba: lượt lúc `13:13:39.433Z` xuất hiện trong cả hai file; file thứ hai thêm lượt `13:13:58.579Z` (giờ địa phương lần lượt 20:13:39 và 20:13:58, UTC+7). Không đưa file tải xuống vào source hoặc lưu dữ liệu người thử trong fixture.

| Điều kiện | Ngưỡng hiện tại | Lượt 1 | Lượt 2 |
|---|---|---|---|
| Shift | ≥ 0,280 | 0,080413 — không đạt | 0,284129 — đạt |
| Phản xạ đỏ (normR) | ≥ 0,040 | 0,012165 — không đạt | 0,044151 — đạt |
| Phản xạ xanh (normB) | ≥ 0,040 | 0,008904 — không đạt | 0,030516 — không đạt |
| Đối xứng nền | Phải đạt | Đạt | Đạt |
| Số mẫu nền/đỏ/xanh | Có mẫu hợp lệ | 3/5/5 | 3/4/5 |

### Những gì xác nhận được

- Cả hai lượt dừng ở phép đo flash; không phải lỗi HTTP 500 hoặc nhãn FAKE do MiniVision trả. Theo luồng hiện tại, flash không đạt nên chưa gọi API MiniVision và chưa cho sử dụng ảnh.
- Đã tính lại từ trung bình RGB, đồng thời chạy `evaluateFlash()` hiện tại trực tiếp với số đo trong file. Các điểm số và danh sách điều kiện không đạt đều khớp, sai số nhỏ hơn `1e-12`. Không thấy lỗi làm tròn hoặc áp sai phép AND trong hai trường hợp này.
- Trình duyệt khai báo iPhone, chuỗi iOS `18_7`; camera báo 720×1280, 30 fps; viewport 393×695; xử lý GPU, lấy frame qua timer. Không suy ra được mẫu iPhone từ user agent. Các timestamp được ghi đều tiến, có mẫu trong từng pha; dữ liệu không thể hiện lỗi watchdog/video dừng. Timestamp tiến vẫn chưa tự chứng minh mỗi lần đọc canvas tương ứng một lần phơi sáng camera khác nhau.
- Camera báo `whiteBalanceMode: manual` và cờ cân bằng trắng đạt; không có `exposureMode` trong capabilities/settings đã thu, cờ khóa phơi sáng là false. Chỉ kết luận **phiên trình duyệt này chưa xác nhận khóa phơi sáng**, không kết luận mọi iPhone đều không hỗ trợ hoặc auto-exposure chắc chắn là nguyên nhân.
- Lớp flash báo đúng màu CSS đỏ/xanh, phủ 393×695; xác nhận lịch vẽ trễ khoảng 25–38 ms sau yêu cầu. Mẫu màu được lấy sau xác nhận khoảng 150–498 ms. Điều này chưa đo được thời điểm ánh sáng vật lý đến cảm biến, độ sáng màn hình thực hoặc màu sau xử lý camera.
- Với riêng các frame đã thu, chênh lệch sắc độ xanh lớn nhất giữa bất kỳ cặp frame đỏ/xanh là khoảng **0,00935** và **0,03117**; cả hai vẫn dưới 0,040. Đây chỉ là phép phân tích để loại trừ nhận định rằng chọn lại các frame trong cùng trace sẽ cho đạt; không đổi thuật toán sang chọn frame có điểm cao. Chưa có cơ sở khẳng định tăng thời gian chờ sẽ khắc phục trên thiết bị thật.

### Kết luận và bước tiếp theo

Phản xạ màu thu được trên hai lượt iPhone chưa đạt điều kiện của thuật toán hiện tại. Chưa xác định riêng lỗi FE, đặc tính camera/màn hình hoặc mức phù hợp của ngưỡng Android trên iOS. Laptop đạt không chứng minh phép đo đã ổn định trên Safari iPhone.

Frontend giữ nguyên model, thời lượng, ngưỡng, điều kiện AND và việc chặn ảnh khi chưa đạt. Không sửa backend hoặc dùng MiniVision một ảnh để bỏ qua flash. Các hướng tiếp theo:

1. Nếu có lượt đạt trên cùng iPhone, giữ trang và lưu thêm báo cáo để so sánh với lượt lỗi dưới cùng điều kiện; ghi mẫu máy, ánh sáng phòng, khoảng cách, độ sáng và Night Shift/bộ lọc màu. Báo cáo hiện không có các dữ liệu này.
2. Đối chiếu bộ đo của nhóm 4 trên native Android và Web, gồm vùng lấy mẫu, chuyển đổi màu và khóa camera. Code native dùng khóa AE/AWB; Web yêu cầu chế độ camera qua constraints và kiểm tra settings, không coi hai cơ chế đương nhiên tương đương. Tham khảo [W3C MediaStream Image Capture](https://www.w3.org/TR/image-capture/#metering-modes).
3. Nếu cần thay thời lượng/phép đo/ngưỡng hoặc phương án xác thực cho iOS, thống nhất với nhóm 4 và đánh giá cả người thật lẫn ảnh/video giả trước khi triển khai. Hai lượt người thật không đủ để chọn một ngưỡng mới.

Đợt này chỉ bổ sung phân tích số đo; **chưa sửa hoặc xác nhận khắc phục liveness iPhone**. Các kiểm thử trình duyệt trước đó chỉ xác nhận điều phối và hợp đồng API, không chứng minh chất lượng phản xạ trên camera thật.

## 9. Lượt iPhone đạt trong file hỗ trợ số 3

File `iriaegis-camera-support 3.json` chứa một lượt lúc `2026-11-17T13:20:45.400Z` (20:20:45, UTC+7). Đã chạy lại `evaluateFlash()` với RGB trong file; kết quả là **đạt bước flash**, không có điều kiện thiếu.

| Chỉ số | Lượt lỗi gần nhất (20:13:58) | Lượt đạt (20:20:45) | Ngưỡng |
|---|---|---|---|
| Shift | 0,284129 | 0,502975 | ≥ 0,280 |
| normR | 0,044151 | 0,076514 | ≥ 0,040 |
| normB | 0,030516 | 0,055252 | ≥ 0,040 |
| Đối xứng nền | Đạt | Đạt | Phải đạt |
| Mẫu nền/đỏ/xanh | 3/4/5 | 3/5/5 | Có mẫu hợp lệ |

Camera/settings/capabilities, cờ khóa, thời lượng và ngưỡng trong báo cáo mới giống hai lượt trước: 720×1280, 30 fps, WB manual, chưa xác nhận khóa phơi sáng, GPU/timer. Lịch vẽ lớp màu được xác nhận trễ 27–29 ms, các mẫu màu lấy sau xác nhận khoảng 151–449 ms. Không có thay đổi cấu hình đo được ghi nhận đủ để giải thích khác biệt đạt/không đạt; không tự suy ra độ sáng, khoảng cách hoặc điều kiện phòng giữ nguyên vì file không chứa các thông tin đó.

**Điều chỉnh kết luận:** đã có bằng chứng iPhone có thể đạt phép đo hiện tại dù `exposure: false`. Vì vậy không thể dùng riêng việc chưa khóa được phơi sáng để giải thích tất cả lượt lỗi, cũng không thể kết luận Safari không chạy được bước flash. Phản xạ xanh ở lượt đạt cao hơn khoảng 1,81 lần so với lượt lỗi gần nhất; nguyên nhân biến thiên vẫn cần đối chiếu điều kiện thử và pipeline camera.

File này chỉ lưu kết quả flash. Nó **không chứa phản hồi MiniVision, đối sánh danh tính hoặc biên nhận điểm danh**, nên chưa xác nhận toàn bộ phiên xác thực/điểm danh đã thành công. Một lượt đạt cũng chưa xác nhận độ ổn định hoặc chất lượng chống giả mạo trên iPhone.

Bước tiếp theo là ghi nhận người thử có thay đổi vị trí máy, khoảng cách, ánh sáng phòng/độ sáng màn hình hay không, rồi đối chiếu các lượt lặp dưới điều kiện được giữ ổn định. Giữ nguyên thuật toán trong lúc thu dữ liệu; chưa sửa code, ngưỡng hoặc backend từ báo cáo này.

## 10. Lỗi kết nối Cloudflare sau bước chụp — 17/11/2026

Ảnh giao diện mới lúc 20:24 hiển thị ảnh đã chụp, trạng thái chưa xác thực và thông báo tiếng Anh về phản hồi origin không hợp lệ/không đầy đủ gửi tới Cloudflare. Đây là lỗi đường truyền/dịch vụ cần kiểm tra riêng với lỗi số đo flash. Ảnh không chứa HTTP status hoặc mã request nên chưa kết luận chính xác status/nguyên nhân của request trong ảnh; [Cloudflare mô tả nhóm lỗi origin tương tự ở tài liệu 520](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-520/).

Lúc kiểm tra máy khoảng 20:26: Web 5173 và cloudflared vẫn chạy, tunnel trỏ đúng Web; cổng 8000 không có listener. Gọi `/liveness-api/openapi.json` qua Web nhận HTTP 502 cùng lỗi không kết nối được dịch vụ liveness. Đây là trạng thái xác nhận tại lúc kiểm tra, không có log đủ để khẳng định tiến trình dừng chính là nguyên nhân duy nhất của request lúc 20:24.

Đã khởi động lại môi trường Python/dịch vụ đã cài sẵn, giữ nguyên source/model/tham số nhóm 4 và không thay ngưỡng flash. Health trả 200. Gửi JPEG tổng hợp 80×80 dạng multipart qua ba đường: trực tiếp 8000, proxy Web 5173 và tunnel công khai; cả ba trả HTTP 200 với `status: success` và trường verdict hợp lệ. Chỉ thử kết nối và hợp đồng phản hồi, không dùng kết quả của ảnh tổng hợp để đánh giá nhận diện người thật/chống giả.

Sửa FE: lỗi gateway 502/504/520–527/530 hiển thị hướng dẫn tiếng Việt về kết nối gián đoạn; 503 và lỗi nội bộ có thông báo riêng, không hiện raw diagnostic của hạ tầng. Giữ HTTP status trên đối tượng lỗi để chẩn đoán. Lỗi, timeout hoặc phản hồi thiếu verdict tiếp tục chặn sử dụng ảnh; thử lại phải chạy phiên mới. Không tự công nhận REAL hoặc cho bỏ qua liveness khi server ngừng chạy.

Kiểm tra thay đổi: lint, 66 kiểm thử Node và build đạt; 6 ca Chrome desktop/mobile và 3 ca WebKit kiểm tra gateway sau flash, thử lại phiên mới, FAKE/lỗi vẫn khóa ảnh và hợp đồng multipart đạt. Đã xem ảnh màn lỗi ở kích thước mobile. Chưa xác nhận lượt thử lại từ iPhone vật lý sau khi dịch vụ được mở lại.
