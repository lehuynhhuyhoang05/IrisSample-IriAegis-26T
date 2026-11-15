# Quy tắc phát triển giao diện

Đọc `DESIGN.md` và `UI-GUIDELINES.md` trước khi sửa UI. Giao diện nghiệp vụ dùng `src/portal/PortalShell.jsx`; thư viện mẫu dùng `src/ui/AppShell.jsx`.

- Thiết kế từ viewport 390px trước, sau đó 360, 768 và 1440px. Không chuyển nguyên sidebar desktop thành một khối nhiều hàng phía trên mobile.
- Dùng token và component hiện có. Mỗi vùng chỉ có một thao tác chính, bỏ mọi câu chữ/thành phần không giúp thực hiện tác vụ.
- Không thêm thư viện UI, font, icon hoặc animation mới chỉ để trang trí.
- Sau khi sửa, dùng Playwright chụp màn thật, mở ảnh và sửa vấn đề nhìn thấy. Test không tràn ngang chưa đủ để kết luận giao diện tốt.
- Ghi đúng môi trường đã kiểm thử. WebKit tự động không tương đương Safari iPhone thật.
- Ghi cải thiện ngoài nghiệp vụ Android là đề xuất; không tự thêm nghiệp vụ hoặc quy tắc backend.
