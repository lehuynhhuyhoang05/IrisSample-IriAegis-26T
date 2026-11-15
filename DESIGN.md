# Thiết kế IriAegis Web

## Hướng giao diện

Ứng dụng công việc cho giảng viên: nội dung ngắn, danh sách rõ, thao tác trực tiếp. Mobile là một bố cục riêng. Tham chiếu nghiệp vụ và nhận diện Android; không chuyển layout desktop xuống điện thoại bằng cách thu nhỏ.

## Token và hình thức

- Nền trắng, chữ `#263238`, hành động `#236E69`, mint nhận diện `#66CFCF`; dùng biến `--ui-*` ở `src/ui/tokens.css`.
- Font hệ thống: iOS dùng San Francisco qua `-apple-system`; Windows dùng Segoe UI. Không tải Inter/Roboto hoặc font trang trí.
- Khoảng cách 4/8/12/16/20/24/32/40. Bo góc control 8px, dialog 12px. Bóng chỉ cho overlay.
- Icon Phosphor qua `src/ui/icons.js`, 18–24px; nét regular, mục điều hướng đang chọn dùng fill. Giữ logo Android sẵn có. Không emoji chức năng.
- Không gradient trang trí, glassmorphism, glow, card lồng card, KPI/hero không có nhu cầu nghiệp vụ.

## Nội dung

- Tiêu đề là tên tác vụ: Môn học, Sinh viên, Điểm danh. Không eyebrow lặp lại, slogan hoặc đoạn hướng dẫn mặc định dưới mỗi tiêu đề.
- Một nhãn Demo nhỏ dẫn đến thông tin/kịch bản. Cảnh báo giả lập tại bước xác thực/gửi khi cần; không lặp banner dài trên mọi màn hình.
- Chỉ hiện giải thích tại thao tác có rủi ro hoặc lúc người dùng cần quyết định. Nội dung kỹ thuật dài đặt trong tài liệu hoặc phần mở rộng.

## Mobile và iOS

- Header khoảng 56px + safe area; thanh dưới có Hôm nay/Môn học/Điểm danh/Báo cáo/Thêm. Chức năng phụ ở menu, không chiếm đầu màn hình.
- Lề ngang 20px; nội dung chính xuất hiện ngay sau header. Thanh dưới dùng `env(safe-area-inset-bottom)` và phần nội dung có chừa khoảng tránh bị che.
- Input tối thiểu 16px, vùng chạm tối thiểu 44px, không tắt zoom. Date/time/select không được làm rộng viewport.
- Danh sách là các hàng có phân cách, không là chuỗi thẻ trang trí. Form một cột, trừ các trường ngắn có quan hệ trực tiếp.
- Hộp thoại vừa viewport, cuộn nội dung, giữ focus và Escape; footer hành động không che trường cuối. Camera giữ oval và video inline.

## Vòng kiểm tra bắt buộc

Chụp và mở ảnh đăng nhập, hôm nay, danh sách, form đang mở, điểm danh và menu ở 390px và 1440px. Kiểm tra thêm 360px/768px, nội dung dài, safe area, bàn phím. Chạy Chromium và WebKit nếu có; ghi riêng phần chưa kiểm tra trên iPhone thật. Thấy menu chiếm màn hình đầu, chữ bị ép vụn, hoặc nút tác vụ bị che thì phải sửa dù test logic vẫn đạt.

## Tham khảo thiết kế đã đọc

Đã đọc [frontend-design của Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) và áp dụng: chọn ngôn ngữ hình ảnh theo tác vụ, bỏ nội dung mẫu, xem screenshot trước khi kết luận. Skill chưa được cài vào máy. Không thêm bộ component lớn; giữ thư viện nội bộ để tránh thay đổi API của các màn. [Phosphor React](https://github.com/phosphor-icons/react) thay Lucide theo yêu cầu thử hệ icon khác; thay icon riêng lẻ không đủ sửa UX.

Danh sách dùng tên hồ sơ làm liên kết chi tiết, giữ hai thao tác sửa/xóa. Hộp thoại gồm đầu, vùng nội dung cuộn và chân riêng; chân không đè lên form. Không thêm dashboard/KPI để lấp khoảng trống.
