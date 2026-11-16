# Thiết kế IriAegis Web

## Hướng giao diện

Ứng dụng công việc cho giảng viên: nội dung ngắn, danh sách rõ, thao tác trực tiếp. Mobile là một bố cục riêng. Tham chiếu nghiệp vụ và nhận diện Android; không chuyển layout desktop xuống điện thoại bằng cách thu nhỏ.

## Token và hình thức

- Nền trắng, chữ `#263238`, hành động `#236E69`, mint nhận diện `#66CFCF`; dùng biến `--ui-*` ở `src/ui/tokens.css`.
- Font hệ thống: iOS dùng San Francisco qua `-apple-system`; Windows dùng Segoe UI. Không tải Inter/Roboto hoặc font trang trí.
- Khoảng cách 4/8/12/16/20/24/32/40. Bo góc control 8px, dialog 12px. Bóng chỉ cho overlay.
- Icon SVG riêng qua `src/ui/icons.js`, lưới 24px, nét 1,7px; mục đang chọn tăng độ đậm. Các hình sổ lớp/lịch học/thẻ hồ sơ diễn đạt nghiệp vụ. Giữ logo Android; không emoji chức năng hoặc thư viện icon mới.
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
- Hộp thoại mobile mở từ dưới lên, cuộn nội dung và giữ footer; theo visualViewport khi bàn phím mở. Giữ focus, Escape và trả focus về nút mở. Camera giữ oval và video inline.

## Vòng kiểm tra bắt buộc

Chụp và mở ảnh đăng nhập, hôm nay, danh sách, form đang mở, điểm danh và menu ở 390px và 1440px. Kiểm tra thêm 360px/768px, nội dung dài, safe area, bàn phím. Chạy Chromium và WebKit nếu có; ghi riêng phần chưa kiểm tra trên iPhone thật. Thấy menu chiếm màn hình đầu, chữ bị ép vụn, hoặc nút tác vụ bị che thì phải sửa dù test logic vẫn đạt.

## Hướng thiết kế cập nhật 16/11/2026

Ứng dụng dành cho giảng viên quản lý lớp: hình ảnh gợi sổ lớp, lịch học và hồ sơ. Điểm nhấn là thứ tự đọc và glyph theo nghiệp vụ, không phải hiệu ứng.

- Palette: nền trắng #FFFFFF, chữ #263238, hành động #236E69, nền nhẹ #F7F9F8, đường phân cách #DBE3E0, mint nhận diện #66CFCF. Không thêm accent trang trí.
- Typography: font hệ thống để giữ dấu tiếng Việt và hành vi iOS; tiêu đề 30px mobile/32px desktop, tên lớp 17px mobile; metadata nhỏ hơn và không lặp tên trường trên từng dòng.
- Bố cục desktop: điều hướng phân nhóm Lớp học/Quản lý/Công cụ/Tài khoản; vùng nội dung theo tác vụ. Không biến trang hôm nay thành dashboard chỉ số.
- Bố cục iPhone: 5 vị trí điều hướng ổn định, trạng thái đang chọn rõ; danh sách đọc theo tên → giảng viên → lịch → sĩ số; sheet có vùng cuộn và nút lưu trong vùng nhìn.
- Duyệt thiết kế: một hệ icon; giữ nhãn chữ cho thao tác khó đoán; không thêm thẻ/gradient/slogan; kiểm tra screenshot trước/sau và thao tác khi bàn phím hiện.

## Skill và nguồn tham khảo

Đã cài và đọc [frontend-design của Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design). Áp dụng cách xuất phát từ nội dung thật, lập hướng thiết kế, kiểm tra screenshot và bỏ phần trang trí không phục vụ tác vụ. Skill cài ở phạm vi Codex người dùng, không chép phụ thuộc vào repository.

Đã tham khảo [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) và [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) của Apple. Đây là Web responsive cho cả Android/iPhone, không dùng SF Symbols hoặc tự nhận là giao diện native iOS.

SVG trong source được vẽ riêng; không lấy từ SF Symbols, Lucide, Phosphor hoặc thư viện ảnh. Glyph cần được kiểm tra ở đúng 18/20/24px; không chỉ phóng lớn để đánh giá.

## Kiểm tra sau thay đổi giao diện

Đợt 16/11 đã chạy đủ 98 bài Chrome desktop/mobile và 49 bài WebKit. WebKit phát hiện nút mở menu chưa nhận focus khi chạm; đã sửa và chạy lại cả ba bài menu/bàn phím/nhãn môi trường, đều đạt. 57 bài Node, lint và build đạt. Bài bàn phím giả lập visualViewport thu nhỏ để kiểm tra vị trí nút lưu; không phải thao tác trên bàn phím iPhone thật. Các kiểm thử API/liveness dùng fixture theo hợp đồng, không đánh giá độ chính xác model thực tế.
