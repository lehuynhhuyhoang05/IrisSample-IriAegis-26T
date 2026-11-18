# Quy tắc phát triển giao diện

Đọc `DESIGN.md` và `UI-GUIDELINES.md` trước khi sửa UI. Giao diện nghiệp vụ dùng `src/portal/PortalShell.jsx`; thư viện mẫu dùng `src/ui/AppShell.jsx`.

- Thiết kế từ viewport 390px trước, sau đó 360, 768 và 1440px. Không chuyển nguyên sidebar desktop thành một khối nhiều hàng phía trên mobile.
- Dùng token và component hiện có. Mỗi vùng chỉ có một thao tác chính, bỏ mọi câu chữ/thành phần không giúp thực hiện tác vụ.
- Không thêm thư viện UI, font, icon hoặc animation mới chỉ để trang trí.
- Sau khi sửa, dùng Playwright chụp màn thật, mở ảnh và sửa vấn đề nhìn thấy. Test không tràn ngang chưa đủ để kết luận giao diện tốt.
- Ghi đúng môi trường đã kiểm thử. WebKit tự động không tương đương Safari iPhone thật.
- Ghi cải thiện ngoài nghiệp vụ Android là đề xuất; không tự thêm nghiệp vụ hoặc quy tắc backend.

- Nhận diện bắt buộc theo Android mint/teal; không tự thay palette. Mobile dùng menu bên trái theo ảnh trưởng nhóm cung cấp, không thêm tabbar dưới. Báo cáo dùng nhãn/số gọn, không vẽ bar màu cho ba tổng trạng thái.

## Phạm vi và cách làm việc gọn

- Nhánh phát triển chính là `HuyHoang`; không tự đổi hoặc push `main`. Phạm vi mặc định là FE/UIUX; không sửa backend, DB hoặc model nếu chưa được yêu cầu.
- Tìm bằng `rg -n`/`rg --files`, đọc vùng code cần sửa. Không đọc lại toàn bộ source, lịch sử hội thoại hoặc tất cả tài liệu để xử lý một việc nhỏ; bỏ qua `node_modules`, `dist`, log và trace khi tìm source.
- Demo: `src/portal/`; Server: `src/server/`; camera/liveness: `src/liveness/`. API: đọc operation liên quan trong `openapi.yml`; các xung đột đã biết nằm ở `DOI-CHIEU-API-SERVER.md`. Chỉ đọc tài liệu dài khi tác vụ cần tới nó.
- Kiểm thử theo ảnh hưởng: tài liệu không đổi hành vi thì chỉ kiểm tra nội dung/diff; logic chạy test liên quan; UI chạy Playwright cho luồng và viewport bị ảnh hưởng, mở screenshot. Chạy toàn bộ Chrome/WebKit ở mốc bàn giao, khi người dùng yêu cầu kiểm tra tổng thể hoặc khi thay đổi dùng chung có phạm vi rộng.
- Với lần chạy dài, lưu log ra thư mục công cụ ngoài repo, chỉ trả kết quả tổng hợp; khi thất bại đọc đúng lỗi và trace liên quan. Không lặp lại bộ test đã đạt nếu chưa có thay đổi hay nghi vấn mới.
- Báo cáo ngắn: kết quả, phần thay đổi, kiểm tra và giới hạn còn lại. Phân biệt fixture với API thật, WebKit với iPhone thật. Không in lại nguyên file/spec/log trong trao đổi.
