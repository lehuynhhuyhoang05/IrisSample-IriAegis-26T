# Liveness Web: phản xạ ánh sáng từ chối người thật trên iPhone

Ngày ghi nhận: 15/11/2026. Tài liệu dùng để trao đổi với nhóm 4; chưa phải kết luận nguyên nhân phần cứng hoặc kết quả đánh giá độ chính xác.

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
